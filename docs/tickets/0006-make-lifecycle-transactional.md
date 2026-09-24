---
id: 0006
title: Make application and patch lifecycle transactional
status: coding
created: 2026-08-30
updated: 2026-09-23
---

# 0006: Make application and patch lifecycle transactional

## Plan

### Sortable native drag transaction boundaries (2026-09-23)

The matching full report `2026-09-24T01-32-50-157Z-66628/report.json` passes 5,051 units and 1,717
browser cases but leaves 54 changed-code coverage failures in 34 files, including 84 uncovered
Sortable lines and eight functions. A trusted three-engine browser case already proves a successful
drag after Document adoption, while document tests cover keyboard preview and a background drop. The
native `dragstart` transfer, `dragover` preview, and `dragend` cancellation branches lack direct
same- and foreign-Document tests. Exercise them through native events, including invalid origin,
transfer payload/effect, background drop, preview-only FormData, committed drop and canceled drag.
Require event order and no extra notifications for a canceled `before-change`, and check nested
controller isolation. Correct source only if a reproducible public behavior fault appears. Preserve
public signatures, owner-Document behavior, accessibility semantics, fixed budgets and thresholds.

Acceptance for this continuation: native drag starts only from a valid handle; preview movement
changes visible order while hidden form values retain the prior order; drop commits accepted order;
ending a drag restores canceled order; nested/disabled origins do not begin a preview; canceled
commit retains prior form values and reports the retained drop value. The existing trusted browser
case must continue to pass in Chromium, Firefox and WebKit. Planned ledger:
`test/ui-sortable-document.test.ts`, any confirmed `src/ui/sortable.ts` fix, this owner ticket,
umbrella 0033, `docs/COMPONENT_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/PROGRAM_AUDIT.md`.
Validate Plan before edits, then run focused tests, TypeScript/ESLint, standalone coverage,
exact-tree fast and full `npm run check` against the 54/34 and 899/69 baseline. The wider audit
criteria remain open.

### External native floating state and refresh (2026-09-23)

The latest matching delivery report `2026-09-24T00-44-21-973Z-66209/report.json` passes 5,044 units
and 1,714 browser cases but leaves 56 changed-code failures in 34 files, with 937 uncovered changed
lines and 73 functions, plus three fixed package-size failures. The shared floating controllers have
direct ownership/reentry tests, yet their external native `toggle` state and refresh after a native
overlay disappears lack direct cross-family evidence. Exercise Tooltip, Hover Card, Popover, Menu
and Context Menu with a native popover stub: external hide and show must reflect `data-state` and
contract-defined trigger ARIA without duplicate component notifications; outside dismissal must
still work. Exercise Popover and Hover Card refresh while an open native overlay disappears but the
controller remains current, retaining focus and positioning. Add one actual three-engine browser
case for external native hide/show on Popover and Hover Card. Test observable state, focus, events
and geometry; correct source only if a public behavior fault is reproduced. Keep owner-Document,
public signatures, fixed budgets, thresholds and lint allowances.

Planned ledger: `test/ui-floating-resource-lifecycle.test.ts`, selected
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`, any confirmed
floating controller source fix, this owner ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING
and PROGRAM_AUDIT. Validate Plan before edits. Run focused unit and three-engine browser cases,
TypeScript/ESLint/format, standalone coverage, exact-tree fast and full `npm run check` against the
56/34 and 937/73 baseline. Other audit criteria remain open.

### Form clear-errors and native Menu interaction boundary (2026-09-23)

The latest matching full report `2026-09-23T23-00-43-821Z-58338/report.json` passes 5,031 units and
1,714 browser cases but leaves 75 changed-code failures in 35 files and the fixed package overruns.
Form `clear-errors` was corrected to validate a first explicit HTMLElement, yet its wrong-kind
native target plus a valid names argument has no direct public regression. Reproduce the old
redirect by temporarily restoring only that overload/resolver behavior, require the current action
to reject without clearing native custom validity, and retain matching-root, selector and implicit
controls. Menu and Context Menu share a native interaction engine; check the documented keyboard
ContextMenu key, canceled touch long-press, and native-disabled versus authored-disabled
pointer/keyboard focus choices through observable focus, menu state, validity, and events. Check the
remaining native-popover `toggle` state-sync path through reflected state and accessible trigger
state. Correct only a reproduced source fault. Keep owner-Document behavior, public signatures,
fixed budgets, thresholds and lint allowances unchanged.

Planned ledger: `test/ui-form.test.ts`, `test/ui-menu.test.ts`, `test/ui-context-menu.test.ts`,
selected `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` checks, any
confirmed owner source fix, this ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and
PROGRAM_AUDIT. Validate Plan before tests or behavior edits. Run original-source negative evidence,
focused suites, TypeScript/ESLint/format, standalone delivery-mode coverage, exact-tree fast and
full `npm run check` against the 75/35 baseline. Full audit criteria remain open.

### Native action targets in Dialog, Form, Disclosure, Menu and Toggle (2026-09-23)

The matching full report `2026-09-23T22-05-28-440Z-41196/report.json` still has 75 changed-code
failures across 35 source files and fixed package overruns. Five remaining action resolver shapes
appear to accept a matching native element but fall back to the caller's local component for an
explicit wrong-kind HTMLElement: Dialog, Form, Disclosure, Menu/Context Menu and Toggle. Toggle's
current test rejects a wrong-kind button; test a non-button child separately. Form `set-errors` and
Toggle `press` also classify a first native element as an overload discriminator. Dialog `close`
uses its first argument as a return value, so only `open` has an explicit target. Reproduce any
redirect through `app.run` with a live nearby component and assert unchanged native state; retain
matching-element, selector and implicit controls, plus native form/reset, disclosure, top-layer and
pressed-state behavior. Correct only confirmed faults by validating any explicit HTMLElement with
the existing resolver and adjusting only proved overload classification. Keep the owning Document,
public signatures, fixed budgets, thresholds and lint allowances unchanged.

The planned ledger is `src/ui/index.ts`, `src/ui/form.ts`, `src/ui/disclosure.ts`, `src/ui/menu.ts`
and `src/ui/toggle.ts`, their Dialog, Form, Disclosure, Menu, Context Menu and Toggle component
tests, `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`, this ticket,
umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. The fast release check adds
`etc/jquery-star-ui.api.md` to refresh only the existing API Extractor warning line number after the
Dialog edit; no public API declaration changes. Validate Plan before editing tests or behavior.
Record original-source negatives, focused suites, TypeScript/ESLint/format, standalone delivery-mode
coverage, exact-tree fast and full `npm run check`. Compare coverage with 75/35 and keep all other
audit criteria open.

The original-source `.git/jqstar/five-action-targets-negative.log` fails eight public cases across
six suites: Dialog, Form reset/set-errors, Collapsible, Accordion, Menu, Context Menu and Toggle
wrong-kind actions resolve to nearby state. The separate `.git/jqstar/toggle-press-negative.log`
fails the non-button `press` target/value probe. These direct failures support the planned narrow
resolver and overload correction.

### Additional explicit HTMLElement action routing (2026-09-23)

The matching 933-file full delivery report `2026-09-23T21-10-29-609Z-23479/report.json` leaves 75
changed-code failures in 35 source files and three fixed package-size failures. Ten other UI action
resolvers accept a matching HTMLElement but can fall back to the caller's nearby component for an
explicit wrong-kind HTMLElement: Combobox, Tabs, Data Table, Chart, Tooltip, Carousel, Hover Card,
Select, Popover and File Upload. Tree, Carousel and File Upload target/value actions also appear to
classify only `#id` strings as explicit targets. First reproduce every redirected action through a
public named action with a live implicit component, then retain matching-element, selector and
implicit controls. Test the target/value overloads directly. Correct only confirmed failures through
each existing resolver and action overload; keep explicit targets in their owning Document and
preserve native selection, forms, focus, disclosure and announcements. Do not change public
signatures, fixed budgets, thresholds or lint allowances.

Action registration narrows Tree's first argument to a `#id` string before its resolver, so Tree's
native-element case is an overload failure rather than a redirected mutation. Carousel `go` and File
Upload `remove` have the same overload shape, while their simple named actions expose the resolver
redirect. Exercise those distinct behaviors separately; the wrong-kind test must prove an actual
redirect before any resolver correction is claimed.

The planned ledger is the eleven matching `src/ui/` controller and `test/ui-*.test.ts` pairs,
`e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`, this ticket, umbrella
0033, `docs/COMPONENT_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/PROGRAM_AUDIT.md`. Validate Plan
before tests or behavior edits. Keep negative evidence, run focused suites and
TypeScript/ESLint/format, then compare delivery-mode coverage, exact-tree fast and full
`npm run check` against 75/35 and the unchanged package limits. Other audit criteria remain open.

Original-source selection `.git/jqstar/eleven-action-targets-negative.log` fails all thirteen new
public tests across eleven suites: ten wrong-kind element actions resolve to a nearby component, and
Tree `expand`, Carousel `go` and File Upload `remove` reject matching native-root/value calls. The
direct negatives support the planned resolver and overload correction.

### Remaining explicit HTMLElement action routing (2026-09-23)

The latest full delivery report `2026-09-23T20-20-59-893Z-21133/report.json` has 76 changed-code
failures in 35 source files and fixed package-size blockers. Six more UI controllers use a
`controlled` resolver that accepts a matching native root element but falls back to the caller's
nearest component for an explicit wrong-kind HTMLElement: Transfer List, Log Viewer, JSON Viewer,
Pagination, Message Scroller and Countdown. Message Scroller `follow` also appears to recognize only
`#id` strings, not matching native roots, as explicit target/value forms. Reproduce each redirect
through a public named action in the existing component tests with a live implicit component, then
retain matching-element, selector and implicit controls. Change source only for confirmed failures,
using each existing resolver to validate any explicit HTMLElement. For `follow`, recognize an
HTMLElement first argument as a target without changing boolean/default semantics. Preserve form
values, focus, live announcements, timers and native state for these families; test observable
boundaries where the changed-code inventory identifies a meaningful gap.

Acceptance for this wave: explicit wrong-kind elements reject before mutating the nearby component;
matching elements and documented selector/implicit forms still work; native state, event and
resource ownership remain intact in focused and selected three-engine browser checks. Planned
ledger: the six matching `src/ui/` controllers and component test files, the selected native-action
browser fixture/spec, this ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT.
Validate Plan before editing tests or behavior. Keep public signatures, fixed thresholds, package
budgets and lint allowances unchanged. Run original-source negatives, focused controls, TypeScript,
ESLint, standalone delivery-mode coverage, fast and full `npm run check` against the 76/35 baseline.
Other program criteria remain open.

The original-source selection `.git/jqstar/six-action-targets-negative.log` fails all six public
wrong-kind element cases while 36 other cases are skipped by the focused filter. Each action
resolves its caller's nearby component. A separate original-source
`.git/jqstar/message-follow-negative.log` fails the matching native root `follow(root, false)` case:
the scroller remains following. These seven failures support the planned existing-resolver and one
overload correction; retain them in the Test ledger.

### Color Picker and Editable explicit-target audit (2026-09-23)

The corrected 933-file delivery baseline `2026-09-23T19-21-50-667Z-9825/report.json` still has 77
changed-code failures in 36 source files. Color Picker's `@ui.color-picker.set` and Editable's
`@ui.editable.edit`, `commit` and `cancel` call resolvers that accept a matching HTMLElement but
fall back to the caller's nearby component for an explicit wrong-kind HTMLElement. Reproduce the
redirect through public named actions with a live implicit component. Retain matching-element,
selector and implicit controls; a proven failure permits only validation through each component's
existing resolver, without changing overloads or public facade signatures. Color Picker also has
untested authored-disabled reflection, native disabled-change recovery and text/color validation
boundaries. Editable has untested native focus, selection, validity and change-event reentry
checkpoints. Add behavior tests only where they assert observable state and newer-owner protection.

Acceptance for this wave: wrong-kind element actions reject without mutating the nearby component;
matching and implicit actions preserve native color/form and editable focus/value behavior; native
callbacks cannot let stale work publish a change or steal focus; replacement resources remain owned
by the current controller. Keep authored disabled/readonly, native validity and accessibility state
intact. Planned ledger: `test/ui-color-picker.test.ts`, `test/ui-editable.test.ts`, focused
lifecycle tests if necessary, proven fixes in `src/ui/color-picker.ts` and `src/ui/editable.ts`, the
selected native-action browser fixture/spec, this ticket, umbrella 0033, COMPONENT_ARCHITECTURE,
TESTING and PROGRAM_AUDIT. Validate Plan before edits. Run direct negative and retained controls,
focused suites, TypeScript/ESLint/format, standalone delivery-mode coverage, fast and full
`npm run check`; compare with 77/36 without changing thresholds, package budgets or lint allowances.
The other audit criteria remain open.

The original-source selection `.git/jqstar/color-editable-negative.log` fails both direct wrong-kind
element tests. Each action redirects to its caller's nearby component instead of rejecting the
supplied HTMLElement. Apply the planned existing-resolver correction in the two controllers, then
retain matching and implicit controls.

### Password Field and Sidebar target and native-boundary audit (2026-09-23)

The shared lifecycle wave passes fast on a matching 933-file tree, while the previous full delivery
baseline still has 80 changed-code checks across 37 source files. Password Field and Sidebar named
actions accept a matching native root element, but their `controlled` resolvers fall back to the
caller's closest component when an explicit wrong-kind element is supplied. Reproduce that
redirected operation through public `app.run` calls with a live implicit component; retain matching
element, `#id` and implicit controls. A confirmed failure permits only an existing-resolver
correction in `src/ui/password-field.ts` and `src/ui/sidebar.ts` so a native element is validated as
an explicit target. Also test Password Field native type re-enhancement, newer visibility reentry
after a native attribute write, replacement listener ownership and the facade toggle; test Sidebar
mobile backdrop close/focus, its facade toggle and native value state. Use an instrumented host only
for the precise reentry point. Do not change the public signatures, fixed thresholds or package
budgets to make the gate green.

Planned ledger: `test/ui-password-field.test.ts`, `test/ui-sidebar.test.ts`, proven source fixes in
their matching `src/ui/` owners, this ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and
PROGRAM_AUDIT. Validate Plan before editing tests or behavior. Run direct negatives and retained
controls, focused suites, TypeScript/ESLint/format, standalone delivery-mode coverage, fast and full
`npm run check` against the 80/37 baseline. Leave other source and program criteria open.

The first direct run fails both wrong-kind element cases while 13 existing controls pass. Each
action resolves to the caller's nearby component and mutates it instead of rejecting the supplied
element. Apply the planned existing-resolver correction in both controllers; retain the failed run
in the Test ledger.

The corrected focused selection passes 20 cases. Full standalone delivery-mode coverage reduces the
backlog from 80 failures in 37 files to 77 in 36; Password Field clears, and Sidebar retains one
defensive stale-controller line. Extend the existing native-element action fixture and selected spec
in `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` to verify
Password Field and Sidebar element targets, wrong-kind rejection and retained native state across
Chromium, Firefox and WebKit. These two files join the planned ledger before editing them. Keep the
other coverage and full-program criteria open.

### Shared UI lifecycle and preserved-focus boundary (2026-09-23)

The matching 933-file delivery report `2026-09-23T17-38-59-853Z-28268/report.json` leaves 81
changed-code failures across 37 source files. `src/ui/lifecycle.ts` still has unexercised
detached-Document rejection, reset cancellation reentry and dual-failure acquisition handling;
`src/kernel.ts` has a preserved-focus checkpoint after native focus-listener registration. These
paths guard resource ownership across every UI controller and a transactional render. Test the
public or exported lifecycle behavior with an actual document host and instrumented native callbacks
at the precise reentry point. Require that a reset invalidated during cancellation schedules no
stale callback, acquisition preserves both errors and runs cleanup once, a detached Document cannot
supply a UI Window, and disposal during focus-listener registration never focuses the retired target
and releases that listener. Retain ordinary reset and focus controls; a demonstrated fault permits
only a scoped correction in the owning source. Do not add tests merely to execute a default no-op or
unreachable defensive branch.

Planned ledger: `test/scoped-observer-acquisition.test.ts`, `test/ui-preserved-focus.test.ts`, any
proved `src/ui/lifecycle.ts` or `src/kernel.ts` correction, this ticket, umbrella 0033, TESTING and
PROGRAM_AUDIT. Validate this Plan before editing tests or behavior. Run focused suites,
TypeScript/ESLint/format, standalone delivery-mode coverage, fast and full `npm run check`; compare
the exact failure entries with 81/37. Keep all fixed thresholds, package budgets and other program
criteria open.

### Native element targets in value-bearing UI actions (2026-09-23)

The matching 933-file delivery report `2026-09-23T16-37-46-727Z-28545/report.json` leaves 87
changed-code failures across 39 source files and fixed package-size blockers. Inspection of Input
OTP, Search Field, Tags Input, Stepper and Multi Select finds the same target/value overload class
corrected in the preceding wave: their facades accept a component root element, but their named
`set`, `add`/`remove`, `go`/`complete`, and `select`/`set` actions identify only `#id` strings as
explicit targets. Their `controlled` resolvers accept a matching element but redirect a wrong-kind
element to a nearby implicit component. Reproduce the element-target failure through public
`app.run` calls in each existing component test, with retained `#id`, implicit-value and
wrong-component controls. A proven failure permits a narrow source correction in the corresponding
five controllers: recognize an HTMLElement first argument as explicit, resolve it through each
component's existing target validator, and preserve the existing overload arity and native/form
semantics. Add direct lifecycle, event or reentry cases for relevant uncovered paths only where they
assert observable behavior; coverage alone is not a reason to change product code.

Planned ledger: `test/ui-input-otp.test.ts`, `test/ui-search-field.test.ts`,
`test/ui-tags-input.test.ts`, `test/ui-stepper.test.ts`, `test/ui-multi-select.test.ts`; proven
corrections in the matching `src/ui/` controllers; this ticket, umbrella 0033,
COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. Validate Plan before changing tests or behavior.
Run the five focused suites, TypeScript/ESLint/format, standalone delivery-mode coverage, fast and
full `npm run check`; compare changed-file failures with 87/39. Keep fixed thresholds, size budgets,
the other source files and full-program acceptance open.

The first direct run fails exactly five new element-target cases while 21 existing controls pass.
Each failed action reaches its resolver with `undefined` because the native first argument was
classified as an implicit value. Apply the planned explicit-element and wrong-kind validation
correction to these five controllers; retain this negative run in the Test ledger.

The corrected five-suite focus passes 35 cases. Direct native edit, reset/clear, reentry and
replacement tests reduce full changed-code coverage to 81 failures across 37 files; Search Field and
Tags Input now clear. Input OTP, Stepper and Multi Select retain the precise entries recorded in
Test. Add the five element-target actions to the existing actual-browser fixture in
`e2e/fixtures/ui-document-ownership.ts` and its selected spec in
`e2e/ui-document-ownership.spec.ts`, checking native input/form values, selected options, step
state, an implicit action and wrong-kind rejection in Chromium, Firefox and WebKit. These two e2e
files join the planned ledger before editing them. Do not use a browser pass to claim the remaining
changed-code or whole-program criteria.

### Changed-code coverage recovery: native field and navigation controls (2026-09-23)

The corrected 933-file delivery report `2026-09-23T15-12-21-834Z-21004/report.json` leaves 93
changed-code failures across 44 source files, while the preceding Clipboard, floating and Pagination
tests clear their three targets. Five native-control files have bounded missed paths:
`number-field.ts` (post-change event ownership, cleanup replacement, element action target),
`time-picker.ts` (native step fallback, normalization reentry, invalid click target, element action
target), `rating.ts` (native change reentry, foreign event target, re-enhancement, element action
target), `toggle.ts` (foreign keyboard/focus targets and element action target), and `toolbar.ts`
(native arrow consumers, selection when earlier candidates are unavailable, element action target).
These are observable cancellation, native-input and focus contracts. Add focused public API tests
that assert no stale change event or write after owner loss, live native state and form value,
correct keyboard/focus boundaries and direct element-target actions. Use an instrumented native host
only where a precise reentry point cannot be reached through ordinary events. Retain passing success
controls. A demonstrated behavior failure may justify a narrow source fix; coverage alone does not.

Planned ledger: `test/ui-number-field.test.ts`, `test/ui-time-picker.test.ts`,
`test/ui-rating.test.ts`, `test/ui-toggle.test.ts` and `test/ui-toolbar.test.ts`, any source fix
proved in their corresponding `src/ui/` owner, this ticket, umbrella 0033, TESTING and
PROGRAM_AUDIT. Validate this Plan before changing tests or behavior. Run focused tests,
typecheck/lint/format, full changed-code coverage, `quality:fast` and `npm run check`; compare
failure entries and affected files with the 93/44 baseline. Keep fixed thresholds, budgets,
allowances, the other source files and full-program acceptance open.

The first five public-action negatives fail, with 24 existing controls passing: an explicit element
argument is treated as a value or amount in Number Field, Time Picker, Rating set, Toggle press and
Toolbar focus, so resolution falls back to `undefined`. The corresponding facades already accept the
element, and these controllers' `controlled` functions have element branches. Treat a first argument
that is a native component target as explicit for actions with target/value overloads, using the
existing resolver to reject a mismatched element rather than silently applying an implicit target.
Preserve the one-argument implicit value/amount forms and `#id` targets. The direct-action forms
that already forward an element remain controls. Add wrong-element and implicit form assertions
around the correction before broader lifecycle cases.

Toggle Group's `select` and `toggle` actions have the same target/value overload and an existing
element branch in `controlledGroup`; include them in the same `src/ui/toggle.ts` correction and test
ledger. Preserve the required-single and multiple-selection forms, and reject a foreign element
without changing either group.

The direct correction now passes 44 focused cases and full delivery-mode coverage reduces the
backlog to 87 failures across 39 files; all five targeted sources clear. Before the fast/full gate,
add one real-browser fixture in `e2e/fixtures/ui-document-ownership.ts` and a selected spec in
`e2e/ui-document-ownership.spec.ts` that runs element-target actions for the five families, includes
Toggle Group and a mismatched target, and checks native value/focus in each desktop engine. Update
the planned ledger with these two files; keep the action semantics and package limits unchanged.

### Changed-code coverage recovery: Clipboard, floating ownership and Pagination (2026-09-23)

The exact 932-file delivery report `2026-09-23T13-35-36-553Z-47216/report.json` passes 4,933 units
and all 1,702 browser cases but fails 96 changed-code checks across 47 of 60 source files.
`src/ui/clipboard-write.ts` has five uncovered liveness checkpoints around clipboard and legacy host
callbacks. `src/ui/floating.ts` has two uncovered owner/reconciliation branches, and
`src/ui/pagination.ts` has one uncovered element-target action branch. These paths govern live
application ownership or a documented named action, so exercise observable behavior through public
UI calls and, where a host callback must reenter at an exact point, a focused helper test. Check
cancellation before any host write, after a hostile getter or selection, replacement of a floating
owner, and a Pagination action receiving an actual element. Require no stale write, notification or
detached resource and preserve ordinary success paths. A failure in behavior will justify a scoped
source correction; coverage alone will not justify changing product behavior or loosening
thresholds.

Planned files: a new Clipboard lifetime test, `test/ui-floating-resource-lifecycle.test.ts`,
`test/ui-pagination.test.ts`, any proven source fix in those two owners, this ticket, umbrella 0033,
TESTING and PROGRAM_AUDIT. Validate this Plan before edits. Run focused tests and changed-code
coverage to measure exact file deltas, then type/lint, fast and full delivery. Keep the other 44+
changed-source files and all fixed package limits in the open audit ledger.

### Nested declarative application ownership finding (2026-09-23)

The first actual Turbo backend coexistence probe put an opt-in declarative application inside the
already installed `#main` application. One child click was handled in both contexts: the visible
child reached `count: 8`, while a Datastar request serialized the outer app's `count: 2`. The same
backend flow passes with a single application per boundary under both hosts. Inspection shows
`DeclarativeApplication.allWithin()` scans every descendant without an active child-application
boundary; outer-first boot binds descendant directives and merges nested `data-signals` before the
child starts. This contradicts independently owned nested consumer applications in ARCHITECTURE.

Before changing runtime behavior, add a focused public-API negative for outer-first and child-first
startup with distinct signals and one child action/request. Determine ownership when a nested root
is a separate application versus a component marker, and cover later enhancement, movement,
preservation, patch cleanup and destruction. Fix only the proven ownership paths while retaining
single-root, component and host behavior. Planned files are `src/declarative.ts` and any needed
kernel/startup boundary code, a direct regression suite, this ticket, umbrella 0033, architecture
and testing docs. Validate this Plan before production edits; then run focused, fast, changed-code
coverage, package and full delivery checks. The actual-host backend slice uses one application per
boundary so its transport proof stays discriminating; this nested finding remains open.

The new public-API negative fails in both boot orders: the outer state contains the child's `inner`
signal and one child button click invokes `@nestedBoundary.hit` for both outer and inner roots. The
precise correction treats an unvalued `data-jqs` descendant as a declarative application island;
named `data-jqs="component"` roots remain ordinary component markers in their parent's directive
scope unless a separately designed app boundary is introduced. Scope initial and mutation-driven
signal/computed/directive scans to that island, and make subtree cleanup release only elements the
application claimed, including after native detachment. Add direct controls for boot order, child
attribute changes, later insertion/movement, preserved removal, outer destruction and a named
component marker. Explicitly booting an application on a named component root remains a separate
ownership case to investigate; do not claim that this marker rule settles it.

The first fast run exposed a page-wide compatibility regression: `$.star.boot()` installs on the
document element and must continue scanning plain `data-jqs` descendants. Restrict island stopping
to applications whose own root is a plain marker. Add a page-wide boot regression and a preserved
patch/ordinary-removal control, plus a child `data-signals` mutation check, before rerunning fast.

The direct regression now passes in both boot orders, including later insertion, attribute changes,
native movement, outer destruction and named-component controls. Extend the existing opt-in
actual-host backend fixture with a separate `nested=1` mode: place an outer plain application around
the backend child, check isolated outer state and one child request/action before and after real
Turbo and htmx replacement in all twelve pinned host/version/engine cases. Keep the single-app
transport control, and retain the named-marker explicit-boot question as open.

### Core retained-document extension Plan (2026-09-22)

The tracked Chromium test now passes four consecutive 208-document UI runs, with an injected
strong-reference negative. The corrected 927-file tree passes 4,927 units and all six fast/23 static
gates under `2026-09-23T04-12-45-309Z-62079/report.json`; its start/end fingerprint is
`89106a5e2ecb5bae042cd68a9a5ab7da1d4fb857ed9e0c9182be3b3f5335fd2c`. The UI proof does not exercise
core-only installed document/application ownership. A read-only ignored probe reuses the existing
browser document fixture's core plugin listener, document listener and first observer paths, plus
idle, behavior and declarative core installations. It captures 39 disposed Documents; all 39
behavior controls pass and all Documents collect on the first explicit Chromium GC in three
sequential runs. A simultaneous probe attempt hit Vite's port allocation race and is not accepted
evidence.

Extend `test/document-retention-browser.mjs` with these 39 core exercises and keep the existing 208
UI source/destination Documents, held/weak-reference controls, twelve-GC bound, ephemeral Vite
server and guaranteed cleanup. Require the core behavior controls and exact 247 captured/collected
Documents. Keep one script so a failed core or UI retention check fails the same repeatable command.
The test remains Chromium source-fixture evidence; other browser heaps, cross-plugin application
combinations, long-running growth and complete lifecycle acceptance remain open. No production
source, public API, package script/content, gate selection, budget or allowance changes.

Planned ledger: the standalone browser test adds the core probe and counts; this ticket, umbrella
0033, TESTING and PROGRAM_AUDIT record the scope, commands, controls and limits. Validate this Plan
before changing the test. Run it three times, preserve an injected-retention failure, check focused
types/lint/format and a full fast tree. AC-34 through AC-37 remain open.

### Retained-document heap measurement Plan (2026-09-22)

The Menubar checkpoint is verified on 926 matching files; the final documented fast tree passes
4,927 units, but `npm run check` still fails changed-code coverage and fixed package requirements.
Document ownership tests prove behavior and resource release, not heap collection. A read-only
Chromium CDP control now collects a weakly referenced detached iframe Document after one explicit GC
while a strongly held Document remains alive. An ignored diagnostic reuses the existing browser
ownership fixtures: all 50 controller families accept one documented mode and their 100 disposed
source and destination documents collect; the nine families with module-level active-record Sets
also pass all six modes, with 108 disposed documents collecting. Three repeat runs of the 50-family
probe have the same result. This is a candidate measurement, not yet a public repeatable test or
full heap acceptance.

Promote the diagnostic to `test/document-retention-browser.mjs`, run directly with Node from the
repository root. It starts the existing Vite demo on an ephemeral loopback port, launches pinned
Chromium, captures only WeakRefs to documents created by the existing 50-family ownership fixtures,
and asserts both a weakly referenced detached control is collected and a held control survives.
Exercise all 50 families in one existing mode and all six modes for the nine active-record families.
After the fixtures dispose and remove their frames, use at most twelve explicit CDP garbage
collections, without a wall-clock or byte-growth threshold. Require every captured document to
collect and all fixture behavior controls to pass; always restore instrumentation and close
browser/server. A failed collection is a diagnostic to inspect, not permission to loosen thresholds
or skip a family. This source-fixture proof is Chromium-specific; Firefox/WebKit ownership tests and
generic kernel, non-UI documents and long-run heap profiles remain separate full-audit work. No
production behavior, public API, browser gate selection, fixed budget, lint allowance or package
contents change.

Planned ledger: new `test/document-retention-browser.mjs` owns the repeatable GC proof; this ticket,
umbrella 0033, TESTING and PROGRAM_AUDIT record commands, counts, controls and limits. Validate this
Plan before adding the tracked test. Run the standalone test three times, check its positive and
negative controls, verify complete types/lint/format and a fresh full fast tree. The source/browser/
API and failed delivery evidence stay historical after tracked edits. AC-34 through AC-37 and the
full audit remain open.

### Menubar action-selector ambiguity Plan (2026-09-22)

The Data Table cost checkpoint is bound to 925 matching files (4,920 units, six fast/23 static
gates, 1,245 browser cases and isolated build/API proof); the documented tree then passes the same
fast gates under `2026-09-23T02-14-10-745Z-68456/report.json`. This is bounded evidence only.
Menubar still overloads the first `@ui.menubar.open|focus` string by checking whether it begins with
`#`. A local menu whose authored `data-value` begins with `#` is therefore mistaken for a target. A
two-argument call with a class or attribute target selector is mistaken for an implicit value. The
string facade resolver also checks only the first selector match, which may be an unrelated element
before the intended Menubar. These are candidate defects; promote direct public negatives and
preserve passing implicit, element and `#id` controls before changing source.

Resolve two-argument action calls as explicit target plus optional value, regardless of selector
prefix. For a one-argument string inside a Menubar, an exact current direct-child menu value takes
priority; otherwise a selector that finds a Menubar is a target, preserving existing `#id` actions.
Outside a Menubar, a matching target selector remains explicit. The static string facade should
select the first matching Menubar rather than fail because a different element matches first; it
must not operate a nested child Menu or a node owned by another document. Invalid/missing targets
still throw the documented unavailable-target error. Keep current DOM parts, action ownership, focus
and child Menu acceptance; do not add a public overload or change package signatures.

Planned ledger: `test/ui-menubar-selector.test.ts` promotes exact-value/selector, competing-match,
missing/invalid and passing-form controls; `src/ui/menubar.ts` owns action resolution and
`src/ui/lifecycle.ts` owns installed-facade string target resolution, since its document guard
resolves strings before the Menubar method receives them; the document browser fixture/spec add a
native one-case-per-engine action proof; this ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING
and PROGRAM_AUDIT record the contract and evidence. Validate the Plan, retain negatives, run focused
Menubar/menu/action suites, types/lint and the three-engine selection, then repeat complete
browser/fast, all-entry build/API and package/delivery checks on frozen inputs. AC-34 through AC-37
and full audit remain open. No fixed ceiling, public baseline, exclusion or lint allowance increase.

### Data Table row-cost continuation Plan (2026-09-22)

The staged plugin listener criterion AC-38 has bounded source/browser/API proof, and the subsequent
documented tree passes 4,909 units and all six fast/23 static gates on 924 matching inputs
(`2026-09-23T01-32-43-537Z-16003/report.json`). This is not full lifecycle acceptance. Data Table
cost remains open: `sourceGuard` fingerprints all rows on every `valid()` call, while
`configureRows`, `render` and `syncSelection` call `valid()` inside per-row or per-control loops.
Source inspection therefore predicts work growing faster than the row count even for an unchanged
page action.

The promoted five-case public diagnostic confirms four cost failures and one native-page control. At
12/24 rows, initial and repeated enhancement read row text 1,032/3,504 times; a page action reads it
1,776/5,856 times. The 24-row page action also makes 500 whole-root selector queries against a fixed
ceiling of 60. These deterministic counts are in `data-table-cost-public-negative-second.log`; no
wall-clock threshold is used.

First promote a deterministic public cost diagnostic that counts native row text reads for two row
counts during initial enhancement, page changes and re-enhancement. Record current failures and
passing behavior controls. The acceptance target is growth proportional to actual rows plus sort
work, with no fixed time threshold or reduced semantic coverage. Preserve synchronous cancellation,
reentrant replacement, live row/part changes, stable sorting, selection seeding and native output.
Use a transaction-scoped native MutationObserver as a synchronous dirty signal: observe source and
part mutations, drain `takeRecords()` on validity checks, and rescan captured rows/controls only
when relevant DOM changed. Continue cheap record/revision/root/table/settings checks on every call.
Native output attributes changed by Data Table itself do not invalidate the source snapshot.
Disconnect the observer in both request and sync `finally` paths; no persistent observer or retained
document reference may remain. Before notifications and after event or overridden native method
boundaries, drain and validate the snapshot. Existing before-sort row edits, table replacement,
reentrant disposal and adoption controls must still pass. The separate 500-query negative confirms
that caching rows alone is insufficient: whole-root control queries must also be bounded.

The first real-browser selection passes all 24 Data Table cost, ownership and native component cases
(eight per engine). Source review of the new observer identifies a setup/cleanup edge before the
final checkpoint: an instrumented `observe` can register then throw, and a failing disconnect can
hide an earlier render/setup error. Add public negatives for both paths and preserve original then
cleanup error order; the observer must always release. Extend the cost suite and Data Table source
within the existing ledger before full verification.

Planned ledger: `test/ui-data-table-cost.test.ts` owns the measured regression and behavior
controls; `src/ui/data-table.ts` owns any confirmed correction;
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add a real-engine
cost and native-output control; this ticket and umbrella 0033 track Plan/Code/Test/Document;
`docs/TESTING.md` and `docs/PROGRAM_AUDIT.md` explain the measurement and limits. Use the existing
public Data Table/browser suites and frozen three-engine cohort after the correction. Do not raise
package budgets or lint allowances. AC-34 through AC-37 and full audit remain open.

### Staged plugin listener cancellation: continuation Plan (2026-09-22)

The document-listener checkpoint is verified on 922 unchanged files: 4,892 units, 3,467 integration
assertions in 109 files, all six fast and 23 static gates, and 1,209 browser cases (403 per engine,
zero skips/flakes/errors). The saved isolated all-entry build, source maps and twelve API Extractor
reports match the same fingerprint. This is bounded listener evidence, not full lifecycle or program
acceptance. The preceding interrupted browser run remains historical.

#### Problem, evidence and acceptance

A staged plugin can cancel its document listener inside instrumented native `addEventListener`
before `stageResource` receives Kernel's release handle. Kernel still regards the pending listener
as current, so synchronous native dispatch enters the canceled plugin callback. The current
five-case public diagnostic fails three cases and passes two controls; actual Chromium, Firefox and
WebKit dispatch fails six cases and passes three controls. A separate six-case diagnostic fails on
every current production case: method/capture/once/passive/signal getter cancellation still reaches
native add, and cancellation inside native add delivers once. A canceled duplicate can also remove
an earlier completed owner. These negatives are source-bound under the ignored audit directory.

Cancellation must suppress only that acquisition immediately, stop native setup after each
extensible lookup, remove any late native registration, and preserve completed unrelated/duplicate
owners. Ordinary completed duplicates still have one native callback and either successful handle
removes it. Native receiver, callback identity, capture/once/passive/signal/default behavior, getter
order, replacement ordering, accounting and setup/cleanup errors remain intact. Cancellation is an
ordinary resource operation and must not fail an otherwise valid plugin installation. No public
DocumentHost signature, package export, fixed budget, lint allowance, exclusion or frozen CSP
inventory changes.

#### Design, boundaries and planned files

`src/plugin.ts` passes a staged resource's active predicate to a private listener acquisition
callback. Append that optional callback to the internal `createPluginHost` arguments; Kernel
supplies it alongside the existing document host. A custom host without the capability retains its
existing `sourceHost.listen` path and argument shape. `src/kernel.ts` checks both kernel and staged
ownership after native method and each options read and after native add. Pending callbacks consult
staged ownership before delivery. A private cancellation marker unwinds only deliberate
cancellation; native setup errors still propagate, and cleanup errors remain visible in
deterministic order. Pending duplicate rollback must preserve earlier completed owners; an old
canceled registration cannot remove a newer accepted replacement. Keep the weak target index and
original listener identity; per-call wrapper replacement or a new persistent signal listener would
change native deduplication and is outside this design.

Source review after the first tracked focused pass finds another canceled method-getter path: the
getter can return a value that is not callable, but `.bind` is read before ownership is checked.
Three ignored negative cases reproduce TypeErrors for undefined, null and plain-object returns after
cancellation. Read the method, check staged ownership, then invoke it with its original receiver
through `Reflect.apply`; do not read its extensible `bind` property. Promote the three cases to a
public suite before this correction. The first fast report covers the earlier source and remains
historical after the edit.

Promote strict public regressions in `test/plugin-listener-cancellation.test.ts` and
`test/plugin-listener-cancellation-getters.test.ts`. Add actual native browser cases to
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`. Update this owner,
umbrella ticket 0033, README, RUNTIME_OWNERSHIP, TESTING and PROGRAM_AUDIT. These files extend the
changed-file ledger. The callbacks are private acquisition coordination, not application
orchestration. Canceled callbacks must not alter DOM, focus, state or ARIA; accepted listeners keep
their existing native accessibility behavior.

#### Verification and scope boundary

Validate this Plan before production source edits. Preserve the negative logs. Verify canceled setup
at method/option getters and native add return/throw, cleanup failures, completed duplicates,
replacement listeners and custom-host fallback. Run strict types, focused kernel/plugin/lifecycle
tests, native browser cases in Chromium/Firefox/WebKit, full fast/static and complete document
family controls on frozen inputs. Rebuild every public entry, declarations and package consumers,
then run the required delivery checks. Keep the documented fixed ceilings and all original
full-audit work: Data Table cost, Menubar ambiguity, retained documents/heap, actual Turbo/htmx
hosts, semantic source/public-claim review and manual accessibility. AC-34 through AC-38 and ticket
0033 remain open until direct current evidence covers them. The bounded AC-38 source/browser/API
checkpoint below now covers that criterion; AC-34 through AC-37 and the full audit remain open.

### Document listener acquisition: continuation Plan (2026-09-21)

The shared acquisition checkpoint is accepted on 921 matching inputs: 4,843 units, six fast and 23
static gates, and 1,155 browser cases pass (385 per engine, no skips/flakes/errors). The terminal
fingerprint matches ad78b8dd844cc388254c37117692ab51da19e59c070e6ae2a2d795e306077fb1.
verify-first-scope-checkpoint.mjs also verifies 3,418 integration assertions in 108 files and the
unchanged all-entry build/maps. This bounded checkpoint leaves all full-scope criteria unchecked.

#### Listener evidence and acceptance requirements

The original typed diagnostic has eight failures/seven controls. Actual Chromium, Firefox and WebKit
delivery reproduces twelve failures/three ordinary controls. The expanded 30-case diagnostic has
seventeen failures/thirteen controls. Failed or interrupted addEventListener leaves native
registrations alive; mutated capture options miss cleanup; retired raw callbacks still deliver. Old
once/aborted registration cleanup can remove a newer registration of the same callback, and removal
can destroy a replacement installed during cleanup. Ordinary native duplicate registration,
once/passive/signal delivery and staged plugin observer behavior provide passing controls.

- Own listener acquisition before reading setup methods or option getters. After each extensible
  read and native registration, stop retired setup and remove any native registration added late.
  Retire callbacks before native removal; retain setup and cleanup errors in deterministic order.
- Capture registration identity and native capture once. Preserve getter order/receiver, first
  registration options, native callback receiver, default passive behavior, once, AbortSignal and
  cross-window targets. Do not reread caller options during cleanup.
- Deduplicate the same target/type/callback/capture while its native registration remains current.
  Either successful handle releases that shared registration. After once, abort or release, a new
  registration has a separate guarded callback so old cleanup cannot remove it. A failed duplicate
  attempt must preserve an earlier or nested successful owner.
- Keep accounting idempotent even if removal throws. A retired callback cannot deliver work when a
  native wrapper invokes it manually or dispatches synchronously during cleanup.

#### Listener design and planned files

In src/kernel.ts, use a provisional per-call resource before acquisition and a target-keyed weak
index of current listener identities. Each identity owns a guarded native callback, captured options
and acquisition count. Normal release retires the shared registration; rollback preserves another
surviving acquisition. Remove identity before native cleanup so reentrant replacement uses a
different native callback. Once delivery retires identity before calling the application, and
aborted signal registrations cannot be reused. No additional persistent signal listener is needed.

Read the native add method first, then capture/once/passive/signal in native dictionary order,
checking ownership after each read. Preserve omitted passive/signal members in a plain snapshot and
leave native signal validation to addEventListener. Boolean/omitted options retain their native
meaning. Call native registration with its original target receiver. Cleanup uses captured capture
and callback values; late return/throw reconciliation removes the old callback again if necessary.
The existing sourceHost staging remains unless public regression evidence requires an extension.

Promote test/document-listener-acquisition.test.ts from the preserved typed draft and add native
identity/getter/replacement controls. Review all DocumentHost callers and staged plugin activation.
Use e2e/fixtures/ui-document-ownership.ts and e2e/ui-document-ownership.spec.ts for actual native
browser regressions. Planned documentation: README appended lifecycle prose, RUNTIME_OWNERSHIP,
TESTING, PROGRAM_AUDIT and tickets 0006/0033. These tickets begin the changed-file ledger.

#### Nested registration follow-up

The first correction passes 179 focused tests, but two new nested-options cases fail while the other
thirty listener cases pass. An outer provisional record cannot share a guarded callback with a newer
nested registration: native registration order can differ from call order, so its once metadata can
suppress valid work, and the older returned handle can remove the nested binding. Refine the
identity index to reuse only completed registrations. A nested acquisition supersedes a
still-pending identity and uses a separate native callback; retirement invalidates the pending
callback immediately, and the outer return/throw removes its own late registration. Completed
ordinary duplicates retain native deduplication and either-handle cleanup. This preserves the newer
accepted operation without guessing which instrumented native method registered first.

#### Getter replacement follow-up

The second frozen fast run passes 4,880 units and all gates, but a fresh five-case diagnostic
contradicts the broader nested-registration contract: method/capture/once/passive/signal getters can
install a newer listener before the outer call publishes its native identity. The outer call then
mistakes that newer completed identity for an ordinary duplicate, and its returned release removes
newer work. The second browser run is intentionally interrupted for this concrete source correction;
its partial results and the passing fast report remain historical, not checkpoint acceptance.

Extend the existing listener Plan with acquisition order allocated before native method/option
reads. A matching identity completed by a newer acquisition cannot be claimed by the older pending
call. The older call retires its provisional ownership and returns its idempotent released handle.
If a newer duplicate finishes during native add, apply the same rollback before committing the older
handle. Ordinary sequential duplicates still share native identity and either completed handle can
remove it. Retain the highest completed acquisition order without replacing native
first-registration options. Add getter variants with and without a previously completed owner and
native-add duplicate reentry controls, plus actual-browser getter regressions. No file manifest
extension is needed.

#### Listener verification and scope boundary

Validate this Plan before source or public test edits. Preserve public negative evidence and run
strict types, focused kernel/plugin/UI lifetime tests, actual native option/default behavior in all
three engines, all 50 document families and existing component controls, full fast/static and
all-entry builds/maps against saved inputs. Record failures and corrections. Do not change public
signatures, API baselines, lint allowances, budgets, exclusions or the frozen CSP inventory.

AC-07/34–37 and full-audit criteria remain open. Size overruns, Data Table cost, Menubar ambiguity,
retained documents/heap, actual Turbo/htmx hosts, package/API/installed consumers, semantic review,
manual accessibility and npm run check/full delivery retain their scope. No commits, pushes,
publication, external messages or mutation tooling are authorized by this continuation.

### Shared first-scope acquisition: continuation Plan (2026-09-21)

The accepted Resizable/Sortable checkpoint covers all 50 document families: 4,753 units, all six
fast/23 static gates and 1,137 browser cases pass on 919 matching inputs. Those inputs were checked
again before this Plan edit. This continuation addresses shared observer and UI record acquisition.
It supplements AC-07 and AC-34–37 without checking their unfinished full-scope criteria.

#### Shared acquisition evidence and requirements

The strict 20-case draft reproduces fourteen failures with six positive controls (55625 exit 1,
types 71821 exit 0). Controlled synchronous constructor/getter/observe instrumentation exposes late
native mutation delivery after disposal, duplicate retained removal observers, overwritten newer UI
records and lost setup errors when cleanup also fails. A real installed Resizable request made
during first-scope acquisition loses its newer value. Native constructors are instrumented for these
tests; ordinary native construction is not claimed to invoke application code. Preserve all earlier
negative logs and the corrected fixture teardown history.

- Register observer ownership before reading or calling its native constructor. Retire callbacks
  before cleanup. Disconnect handles returned or registered after disposal, on both return and
  throw. Preserve callback arguments and native receiver during ordinary delivery.
- Preserve setup failures and aggregate any cleanup failure in deterministic order. Retire resource
  accounting even if disconnect throws. A constructor that throws without returning its private
  native handle remains responsible for that inaccessible handle.
- Reentrant first scoped acquisition retains one removal observer. Preserve the newer observer,
  release the superseded outer candidate, and deliver exactly one cleanup to each acquired owner
  after actual native removal. Test constructor and observe reentry and failure after reentry.
- Publish a provisional UI map entry before scope acquisition. A replacement survives old success,
  failure, release and disposal. Superseded old resources release once, even when cleanup throws.
  Verify installed controller values, listener counts and subsequent native keyboard behavior.
- Review all 44 ownUIRecord call sites for continuation after setup. Active/current guards must
  protect controller writes and native acquisition. Record any demonstrated controller extension in
  this Plan before changing it, with fresh regression evidence. Preserve all 50 families' native
  cancellation, focus, form, adoption and replacement contracts.

#### Shared acquisition design and files

In src/kernel.ts, createOwnedObserver owns a provisional lifetime and optional returned handle.
Guard its callback and check the kernel after constructor lookup, construction and observe. One
failure path releases an active resource or disconnects a late handle after earlier retirement.
Aggregate setup/cleanup errors without redundant ordinary disconnects. During first scoped setup,
retain a newer resourceRemovalObserver instead of overwriting it and release the outer candidate.

In src/ui/lifecycle.ts, ownUIRecord publishes before ownUI, deletes only its own map entry during
cleanup and immediately releases a superseded acquisition. It never restores an older record.
Promote the canonical typed draft into test/scoped-observer-acquisition.test.ts, with imports and
fixtures arranged consistently with existing public suites. Extend this suite and existing public
controller suites when follow-up evidence requires. Planned documentation: README lifecycle prose,
RUNTIME_OWNERSHIP, TESTING, PROGRAM_AUDIT and tickets 0006/0033. Preserve frozen README expression
locations by appending new prose. No public signature, registry/backend ownership, lint allowance,
API baseline, exclusion, size ceiling or frozen CSP inventory changes.

#### Shared acquisition verification and acceptance boundary

Validate this Plan before tracked tests or source changes. Preserve fresh public negatives, then run
focused kernel/scoped/UI resource/controller tests and strict types/lint. Review all helper callers,
run the complete UI/integration selection, all 50 browser document families and established
native/accessibility controls, then full fast/static and unchanged all-entry builds/source maps.
Bind acceptance evidence to frozen current inputs. Existing size overruns remain audit failures.

The changed-file ledger starts with this ticket and umbrella 0033. Planned source and test files
above are added when edited; logs use ui-first-scope-* under the ignored September 19 audit
directory. The previous checkpoint becomes historical after these edits. Data Table cost, Menubar
ambiguity, retained documents/heap, actual Turbo/htmx hosts, fixed budgets, package/API/install
proof, semantic source/public-claim review, manual accessibility and npm run check/full delivery
remain required. No commits, pushes, publication, external messages or mutation tooling are implied.
Tickets 0006/0033 remain coding.

#### Shared acquisition controller follow-up

The first shared correction passes 162 focused tests after correcting a constructor-reentry fixture:
the nested mock now returns a real native observer rather than an empty mock instance. Exact
pre-edit kernel/lifecycle sources were recovered and hash-verified for an isolated corrected-fixture
negative; runtime source is not rolled back. Types pass; two lint findings about synchronous reentry
narrowing are corrected without allowances. Follow-up first-acquisition request tests in the
navigation and disclosure/step document suites expose two failures with 155 passing controls:
Pagination resets a newer page and Stepper resets a newer step to their pre-acquisition snapshots.

Extend the planned source manifest with src/ui/pagination.ts and src/ui/stepper.ts. Both records
already contain their initial values before ownership setup. Apply refreshed snapshot values only to
reused records; a newly acquired record must keep any newer request accepted during setup. Clamp
Pagination's initial page in its initializer. Preserve required listener setup after newer requests,
and stop retired records before subsequent controller work. The two existing document suites join
the changed-file ledger. Full helper-caller review and replacement-path proof continue.

The replacement-path public regression exposes a further acquisition gap: a published provisional
Resizable record still has its initial no-op cleanup until ownUIRecord returns. Replacing its parts
and requesting a newer value during observe therefore cannot retire and reacquire the old record.
Extend the private helper contract to records with a cleanup function. Install an idempotent
provisional cleanup before publishing the record; it removes only its own map entry and retires
local resources immediately. Once native ownership returns, release its handle if that provisional
lifetime already ended. All existing UIResources records already have the required field. Adapt
Toast's private release field to cleanup and update internal helper fixtures to this explicit
contract. src/ui/toast.ts joins the manifest. No public type or action changes. Verify early
retirement, replacement, cleanup failures and exact listener ownership before accepting this design.

The 49-family registry diagnostic covers the families behind all 44 ownUIRecord call sites. Its
first run has 27 failures/22 controls, including two fixture errors (Menu's registry filename and
Toast's dynamically generated root) and expected retired-acquisition rejection. Corrected fixtures
and explicit checks that replacement setup completed before accepting an older rejection give ten
stale-part write failures and 39 controls. Promote this diagnostic into
test/ui-first-scope-replacement.test.ts with a self-contained family list. The eight affected direct
controllers are Carousel, Combobox, Menubar, Multi Select, Select, Tabs, Transfer List and Tree.
Their source files join the planned manifest: stop a retired record immediately after ownership
returns, before unguarded metadata/render writes. Existing current guards still protect later work.

Date Picker and Date Range Picker expose a separate shared condition: a formerly connected Popover
root can be detached while its first removal observer is being installed. Since that removal
predates observe, no native removal record is queued. The public scoped suite reproduces this
missing rejection (one failure/26 controls). Snapshot initial connection in kernel own and reject a
connected-to-detached root after acquisition; preserve initially detached roots and moves that end
connected. Failed acquisition must not register the caller's service or invoke cleanup before
ownership succeeds. Existing ownUI rollback retires the provisional controller. These changes stay
within the shared acquisition Plan and require fresh all-family validation.

The first broad fast run (7022 exit 1, report 2026-09-21T19-52-00-238Z-61097) records 4,834 passing
units and three remaining replacement failures. Those failures are cleanup writes from uninitialized
Popover/Menu records. A separate five-case diagnostic also reproduces the same behavior in Tooltip,
Hover Card and Context Menu when their whole root is replaced during setup. Extend the manifest with
src/ui/popover.ts, src/ui/menu.ts, src/ui/tooltip.ts and src/ui/hover-card.ts. Track whether initial
DOM metadata setup began before cleanup reflects closed state; still close a record that a reentrant
request actually opened before initialization. Promote all five regressions and retain a positive
early-open cleanup control. Full fast also identifies two lint failures: express the saved
connection requirement through canOwn's private validator, and narrow the caught test error before
reading its message. Keep both failures in the ledger and change no allowances.

Browser verification also extends e2e/fixtures/ui-document-ownership.ts and
e2e/ui-document-ownership.spec.ts. Add three-engine native late-observe disposal checks for normal
return and subsequent throw, plus installed Resizable request/replacement and Pagination/Stepper
first-scope requests with subsequent native keyboard/click interaction. Inspect actual retained
observer counts and native disconnects. Keep the original all-family/native/accessibility selection
and add these cases; use fresh artifact paths without overwriting the accepted component checkpoint.

### Resizable and Sortable documents: continuation Plan (2026-09-21)

Feed is accepted on 917 frozen inputs: 4,603 units, all six fast/23 static gates and 1,086 browser
cases pass. The matrix covers 48 families. Current source/fingerprint verification matches that
checkpoint before this Plan edit. The previous goal turn made progress; this continuation implements
the remaining two document families without closing the full audit.

This work supplies further evidence for existing AC-22, AC-23, AC-25, AC-26 and AC-34–37; those
criteria remain unchecked until their complete required scope is proven. Accessibility includes
native separator values, keyboard and visible pointer alternatives, stable labels and native form
order. Target/source ownership and canceled interaction checks remain required; no HTML evaluation,
network transport or application orchestration is added to the generic controllers.

#### Evidence and scope

Read both complete controllers, primary suites, lifecycle/current-parts suites, Resizable/Sortable
portions of the combined form-pointer resource suite and component contracts. Existing 32-case
corrected diagnostic exposes 30 failures/two controls. The expanded 90-case diagnostic has 82
failures/eight controls, with all earlier versions retained. Expanded diagnostics add named action
root/selector/element resolution, canceled native/jQuery actions, direct source patch reentry,
read-only value inspection, inert ancestors, provisional acquisition, both adoption orders, canceled
pointer presses, newer Sortable native-notification chains and patched order during preview. Fresh
foreign-element failures that stop at ambient brands require rerunning downstream checks after
correction. Adoption retains values/keyboard but the stronger destination-window event check fails.
Native local pointer capture/move/end and preview FormData/cancel controls pass. Preserve exact
versions and source/config/test/log hashes; assertions are not unique bug counts.

#### Required behavior

- Use native DOM brands, an installation Document passed privately from src/ui/index.ts, and
  owner-window events, storage and pointer sessions. Native controls adopted to another installation
  reacquire exactly one listener set; source disposal cannot revoke destination work.
- Resolve facade targets and explicit string/element actions within that installation, including an
  application root matching the selector and implicit root actions. Preserve existing argument
  forms. Sortable must distinguish implicit item values beginning with # from explicit selectors
  using action arity/native target identity; retain exact values in events and native form order.
  Canceled native and jQuery events, constrained roots/ancestors/controls and nested unrelated
  controllers cannot activate native or named operations. Keep documented direct API semantics.
- Start intent/revision before caller-controlled iteration, getters, cleanup and native writes.
  Capture current part/value/constraint identities; expected writes update snapshots. Newer
  requests, direct source patches, replacement, adoption, outgoing ownership and disposal stop older
  writes, storage, focus and notification chains. Read-only inspection does not supersede pending
  work. Event arrays are snapshots, not aliases of accepted controller arrays.
- Preserve Resizable alternating panel/handle anatomy, arbitrary valid panel count, percent
  normalization, min/max pair constraints, both axes, step/shift and Home/End/collapse/restore,
  default reset and optional storage. Unchanged enhancement retains active dragging; changed parts
  or incompatible orientation/constraints cancel stale sessions. Only active drags hold window
  listeners. Retire before cleanup; release exact old capture even if individual cleanup throws.
  Provisional listener/capture acquisition must release resources acquired after interruption.
- Preserve Sortable item identity and supported exact string values, repeated form order, scoped
  generated hidden inputs with nested matching names, native Up/Down alternatives, keyboard and HTML
  drag preview/drop/cancel behavior, authored controls/labels and announcements. Unchanged
  enhancement must retain listeners and current preview. Direct authored order patches supersede
  preview, and changed list/item membership reacquires current controls. Cleanup can restore an
  owned preview but cannot overwrite a newer record, externally patched state or replacement list.

#### Design and files

Use existing UIResources/ownership/listener primitives where appropriate, with local current-parts,
source snapshot and request guards. No shared kernel/lifecycle fix silently bundled. Keep unrelated
application behavior in registry blocks. Planned source: src/ui/resizable.ts, src/ui/sortable.ts,
src/ui/index.ts. Planned public suites: test/ui-resizable-document.test.ts and
test/ui-sortable-document.test.ts. Extend e2e/fixtures/ui-document-ownership.ts and
e2e/ui-document-ownership.spec.ts with six modes per controller and real native pointer/drag,
keyboard, storage/form/adoption/render checks. Keep primary/resource/lifecycle/exact-value controls.
README, COMPONENT_ARCHITECTURE, RUNTIME_OWNERSHIP, TESTING, PROGRAM_AUDIT and tickets 0006/0033
receive behavior/evidence updates. Lint inventory may only decrease after measured obsolescence. No
API baseline, exclusion, budget ceiling or frozen CSP inventory change.

#### Verification

Promote corrected typed public regressions (44 Resizable, 46 Sortable plus the eight-case
leading-hash action supplement) and retain fresh negatives before source changes. Add current native
pointer session, release-error sweep, setup-reentry, nested-controller, labels and options/iterator
cases where source review requires. Tests must prove fixture acquisition and exact native resource
state, avoiding assertion-count-only evidence. Run primary/document/resource units, current
integration selection and types/lint. Run six browser modes each and established native/
accessibility component controls across Chromium/Firefox/WebKit. Bind full browser, all fast/static
checks and isolated all-entry build/maps to one frozen input set. Confirm zero skipped/flaky cases.
Bundle overruns remain failures to be addressed in the full audit, not adjusted ceilings.

#### Acceptance boundary

This continuation finishes the remaining two document families only after full current-input proof.
All 50 still need cross-cutting acquisition, disposal, performance and retained-document review.
Shared first-scope findings, Data Table performance, Menubar ambiguity, actual host matrices, fixed
budgets, current package/API/installed consumers, source/public-claim semantic review, manual
accessibility and actual npm run check/full delivery remain open. No commits, pushes, publication,
external messages or mutation tooling are implied. Tickets 0006/0033 remain coding.

Changed-file ledger starts with this ticket and the planned public regression suites. The private
factory calls in src/ui/index.ts, both controllers, browser fixture/spec, public/brain documentation
and umbrella ticket follow during implementation. Keep command logs under
.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-resizable-sortable-*. Preserve failed runs.

### Form and Questionnaire documents: continuation (2026-09-21)

The accepted Calendar checkpoint passes 4,275 units, 2,891 integration tests and all 996 browser
cases (332 per engine, no skips or flaky results). Its 127 source and 913 worktree hashes match the
fast fingerprint at browser exit. The next two controllers start from 20 failing diagnostic unit
assertions and nine real-browser assertions, preserved under `ui-form-questionnaire-*` and
`ui-form-native-browser-*` in the ignored September 19 audit directory. These counts are assertions,
not distinct defects. Existing primary, resource, reset, association and public contracts have been
read. Form is implemented first; Questionnaire remains required within this continuation.

Form must use native DOM brands, captured documents/windows and provisional resource cleanup.
Reacquire adopted roots without losing native values, custom validity or authored messages. Resolve
application-root, selector and element action targets within the installation document. Native and
named interactions honor canceled events and disabled/inert constraints; direct APIs retain their
programmatic contract. Snapshot current native associations, controls, Field/message parts and
validation source for each operation. Guard continuation after callbacks, native writes, source or
part changes, disposal and newer requests, including requests started by error-object getters or
options. Queued invalid/reset work must use the captured owner and respect cancellation and newer
intent while unchanged enhancement retains pending work. Keep reset's existing microtask timing. Use
native prototype access for the `elements` collection and reset/checkValidity/reportValidity methods
so controls with those names remain valid native fields. Other property collisions need separate
evidence before changing shared ownership helpers. Preserve external input/select/textarea
association, clearing errors on disabled controls, native FormData, localized validity,
first-invalid focus, cancelable before-submit and clearing only runtime-owned server/ARIA state.
Failed listener setup must release earlier registrations, and cleanup reentry must retain the
replacement record.

Questionnaire must use the same document/resource boundary while retaining default navigation,
answers, skipped and submitted history across reacquisition. Refresh current form, direct fieldsets,
controls and navigation parts through facades as well as enhancement. Exclude parts belonging to
other nested controllers. Preserve read-only inspection of proposed navigation during cancelable
events without early DOM commits. Establish intent before answer iterators, setup and parsing; check
current values/constraints after callbacks and every live native write. Canceled/disabled/inert
navigation and canceled native submission must not advance state. Newer answers supersede pending
reset work. Preserve native validation, required/min/max choices, freeform values, authored disabled
controls, descriptions, FormData and validation before application submit handlers.

Planned files and purposes: `src/ui/form.ts` and `src/ui/questionnaire.ts` own controller fixes;
`src/ui/index.ts` may pass the private Questionnaire owner without changing its public API. New
`test/ui-form-document.test.ts` and `test/ui-questionnaire-document.test.ts` promote and expand
diagnostics. Existing family/resource suites may receive focused regressions. The two existing
document-ownership browser files add both families in all six modes and real native
method/collection shadowing checks. README, component/ownership/testing guides, PROGRAM_AUDIT, this
ticket and 0033 record behavior, changed-file purposes, exact commands, failures and evidence. No
shared helper, public signature, baseline, allowance, budget or frozen CSP inventory change is
planned.

Validate this Plan before implementation. Retain public negative runs before fixes, then execute
focused family/resource/CSP tests, full UI/kernel/bridge integration, types/lint, all three browser
engines and fresh quality:fast on frozen inputs. Current-state browser/fast bindings are required
before either family checkpoint. All six remaining families, cross-cutting review, actual hosts,
fixed budgets, package/API/install proof, source/claim review, manual accessibility and actual npm
run check/full delivery remain required. AC-34 through AC-37 remain unchecked.

The Form public negative records 54 failures and seven passing controls. The first correction passes
147 family/resource cases. Expanded native-validation, submission and getter tests expose four
additional failures; correction passes 157 focused/resource/CSP cases and full typecheck/lint. The
targeted browser run passes 27 cases (18 Form document cases and nine existing native/accessibility
controls), zero skipped/flaky/unexpected, with all 914 worktree hashes verified at terminal session
82730 exit zero. Two validity-ownership negatives and an expanded six-failure description/partial
write run follow it. Remembering owned server messages and descriptions weakly per control, and
marking ownership before interruptible native writes, passes all 71 public and 161 focused cases.
Current typecheck and focused lint pass. Preserve newer authored custom validity on validating
controls, retain authored message references, and remove obsolete generated references when a
message part changes. These are within the planned ownership boundary. The earlier targeted browser
result is historical after those final source edits; fresh browser/fast evidence remains required.

Changed-file ledger so far: `src/ui/form.ts` implements the Form corrections. The new Form document
suite promotes diagnostics and adds continuation controls. Both document-ownership browser files add
six Form modes and native field-name/association/submission/reset proof. README and the component,
ownership and testing guides describe the corrected contract. This ticket, 0033 and PROGRAM_AUDIT
record scope and evidence. Questionnaire source and its public suite remain to implement. No shared
helper, private index wiring, public API, allowance, fixed budget or frozen CSP source changes.

Commands use canonical Node 24/npm 11.
`npm run ticket:validate -- --phase plan --ticket  docs/tickets/0006-make-lifecycle-transactional.md`
passes before source changes. Focused checks use
`npx vitest run test/ui-form-document.test.ts test/ui-form.test.ts test/ui-form-association.test.ts  test/ui-form-pointer-resource-lifecycle.test.ts test/csp-entrypoint.test.ts`.
Types use `npm run typecheck`; ESLint selects the Form source/public suite and both document browser
files. Targeted Playwright selects the document/component specs on desktop Chromium/Firefox/WebKit
with `Form supports|validated forms and composed surfaces|range and backend form states`. Each
invocation writes a distinct `ui-form-document-*` log/artifact directory under the September 19
audit path. Complete integration, full browser cohort and fresh fast gates must bind final
documented inputs before acceptance. The full two-controller Plan and all original audit
requirements remain open.

Questionnaire implementation now starts from the accepted Form checkpoint: all 4,346 units, 1,014
browser cases, six fast and 23 static gates pass against 914 matching worktree inputs. The
additional corrected Questionnaire probe has ten failures and two passing controls. Its first
nested-radio fixture had native group ambiguity; retain that diagnostic and use the corrected
separately named checkbox fixture. A real field named `requestSubmit` also breaks the submit facade
in Chromium, Firefox and WebKit. Use the native Form prototype while preserving submitter ownership.
The detailed negatives and source bindings are in `ui-questionnaire-continuation-probe-inputs.json`
under the ignored September 19 audit directory. Preserve proposed-value read-only inspection and
unchanged enhancement as passing controls. Keep authored previous-button disabled state separate
from the runtime navigation limit. Extend the pending-reset contract to all newer explicit requests,
including navigation: an older native reset must not undo a subsequent accepted request. The old
resource test's preserve branch clicks Next after reset; update only its obsolete reset-event
expectation after the new negative proves this ordering. Preservation still retains listeners and
unchanged enhancement still retains a current reset. Public negatives precede source changes.

Questionnaire public promotion records 53 failures and six passing controls before source changes.
The first implementation passes all 59 new cases but the focused suites expose two focus regressions
and the planned newer-reset expectation change. Explicit tabindex fixes fieldset focus, and the
resource test now expects the newer preserved navigation to survive. All 138 focused/resource/CSP
cases pass. Four source follow-ups expose internal disabled-ancestor and changed-default races;
operation snapshots now include those inputs. Using the native inert attribute exposes a resource
fixture dispatch into an inactive question. Return that fixture to its active question and add two
explicit inactive-input cases. All 65 public and 144 focused cases pass. The generator fixture's
return type is corrected without changing iteration behavior. Full typecheck passes. Targeted
browser session 97092 exits zero with 24 passes and no skips/flakes; all 915 input hashes verify.
The fixture's FormData join fails lint because entries can be Files; compare actual entries instead.
These intermediate results require fresh final current-input verification before acceptance.

Questionnaire changed-file ledger: `src/ui/questionnaire.ts` implements captured resources, current
parts/source/default observations, guarded writes and events, reset revisions, native Form prototype
submission, action resolution and authored-button ownership. `src/ui/index.ts` passes the existing
owner in the same private factory call line, avoiding unrelated API-report line drift. The new
public document suite and existing resource suite preserve negative and positive contracts. Both
document browser files add six Questionnaire modes; the full grep adds both existing Questionnaire
component checks on all three engines. README, component/ownership/testing guides, PROGRAM_AUDIT,
this owner and 0033 describe behavior and evidence. Shared helpers, public types/baselines, lint
allowances, budgets and frozen CSP inventory remain unchanged.

Commands use canonical Node 24/npm 11. Focused Vitest selects the Questionnaire document, primary,
resource, native-reset, popup and CSP suites. `npm run typecheck` includes production and registry
configs. Focused ESLint selects the controller, private index, both Questionnaire suites and browser
fixture/spec. Targeted Playwright uses both document/component specs, three desktop projects and
`Questionnaire supports|questionnaire`, with two workers. Complete integration selects all UI suites
plus DOM, kernel, bridge, declarative, harness and Access Manager suites. Distinct logs and
immutable startup bindings are under `ui-questionnaire-document-*` in the audit directory. Final
formatting, spelling, Plan and diff checks precede fresh quality:fast and full browser checks on
frozen inputs. All remaining audit requirements and AC-34 through AC-37 remain open.

The first full Questionnaire check passes 4,411 unit tests and 22 of 23 static gates. The exact lint
inventory detects two fewer non-null assertions and one extra unnecessary condition: an action
ancestor cast incorrectly declares a nullable value non-null. The full browser run passes 1,038
cases, 346 per engine, without skips or flakes. All 915 startup hashes and the terminal fingerprint
match the first fast report. Before final acceptance, replace that cast with the existing native
Questionnaire root guard and reduce only the obsolete non-null allowance from nine to seven in
`quality/lint-boundaries.json`. Add that file to this continuation's manifest and changed-file
ledger. No allowance increases or rule exclusions are permitted. Preserve this failed fast report
and the passing browser result as intermediate evidence, then bind fresh checks to the corrected
tree.

The correction passes all 144 focused cases and `node scripts/quality/check-lint-boundaries.mjs`.
`ui-questionnaire-document-focused-fifth.log` and `ui-questionnaire-document-ratchet-final.log`
retain those terminal results. The existing optional native scroll support stays intact. Final
browser/fast checks use new artifact paths and startup bindings; earlier evidence is retained.

### Toast and Feed documents: continuation Plan (2026-09-21)

Complete Toast and Feed controllers, primary contracts and their resource suites have been read. Two
isolated diagnostics contain 44 assertions: 40 fail and four controls pass. They cover local and
foreign documents without ambient realm replacement. Their source bindings and negative logs are
`ui-toast-feed-document-probe-*` and `ui-toast-feed-boundary-probe-*` under the ignored September 19
audit directory. These are assertion counts, not counts of distinct defects. Questionnaire's final
lint correction and current-input acceptance precede implementation of this continuation.

Toast must reject canceled or constrained native close, action, Escape and F8 interactions, and
exclude controls belonging to other nested controllers. Validate current parts, viewport, document
and source constraints after callbacks and live writes. Replaced controls become inert immediately;
unchanged enhancement does not supersede an accepted dismissal. Preserve reentrant newer dismissal,
adoption, remaining display time, composed hover/focus/window/visibility pauses, swipe capture and
cancellation, safe text rendering, required action alternatives, separate announcement expiry and
owner-document focus recovery. Own setup before interruptible native acquisition; stop subsequent
live writes after disposal, including options getters and initial attribute writes. Explicit action
elements and application-root selectors must resolve in their installation document. Native and
named actions honor cancellation/constraints; direct facades retain their programmatic contract.

Feed must use native DOM brands and owner-window events and observers. Refresh parts and patched
cursor/done state through facades. Establish request intent before options getters and callbacks;
newer reset, complete, fail, load or focus work must supersede an older continuation. Guard native
writes, event chains, pending focus and scrolling against source/part changes, adoption and
disposal. Use the current visible native More button for authored loading, retain loading/done/error
semantics, exclude nested controllers and respect canceled/constrained activation. Preserve article
identity, labels, position/set-size, Page Up/Down and Control+Home/End navigation, current pending
focus and application-owned result HTML. Own listeners and observers before acquisition; failure
releases earlier registrations, cleanup sweeps every release, and reentry retains the replacement.
Unchanged enhancement must not churn observers or lose state. Prove both adoption cleanup orders.

Planned files: `src/ui/toast.ts` and `src/ui/feed.ts` contain the fixes; `src/ui/index.ts` may pass
Feed's existing document through its private factory call. New `test/ui-toast-document.test.ts` and
`test/ui-feed-document.test.ts` promote and expand diagnostics before source edits. Existing primary
and resource suites retain their positive controls. The two document-ownership browser files add all
six modes and existing native/accessibility cases. README, component/ownership/testing guides,
PROGRAM_AUDIT, this ticket and 0033 document the final behavior and evidence. A measured obsolete
lint allowance may only decrease. No shared helper, public signature, API baseline, fixed budget or
frozen CSP inventory change is planned.

Validate this Plan, retain public negatives, implement and verify each family independently. Run
focused family/resource/CSP tests, full UI/kernel/bridge integration, types and exact lint checks,
all three browser engines and fresh quality:fast against frozen documented inputs. Expand evidence
when a foreign test initially stops before its downstream assertion. All 50 families still need
cross-cutting review; Resizable and Sortable remain in the document pass after Toast and Feed. The
full actual-host, bundle-budget, package/API/install, source/claim, manual accessibility and
`npm run check`/delivery requirements remain open. AC-34 through AC-37 remain unchecked.

Toast implementation is in progress. The new `test/ui-toast-document.test.ts` promotes 62 public
cases. Before the source changes, 45 failed and 17 controls passed in
`ui-toast-document-negative.log`. `src/ui/toast.ts` now guards document ownership, current parts,
cancellation, generated labels, resource acquisition and continuation after native writes. Its first
focused run passes all 129 assertions but exits one because invalid action markup was attached
before validation and then retried by the observer. Initial type checking also rejects direct access
to `defaultPrevented` on the native/jQuery event union. Move validation before attachment and check
both event forms. Preserve both failed logs. These edits follow the accepted Questionnaire
checkpoint and have no current fast/browser acceptance yet. Changed files in this continuation are
the Toast controller, its new public document suite and this ticket; broader planned files follow
verification.

The expanded public suite now contains 84 cases. The second focused run recorded four failures:
local/foreign focus transfer restarted timers and cleanup could move a Toast before the older
operation removed it. After correction, 145 focused tests and 3,092 integration tests pass. Targeted
browser verification passes 24 cases across Chromium, Firefox and WebKit, including the six new
modes and existing native/accessibility controls. Types, targeted ESLint and the exact immutable
lint ratchet pass (349 TypeScript files, 286 file/rule counts) before the final target correction.

The final source review adds six failing target-constraint assertions. Named show/clear must respect
the viewport/Toast target while direct show keeps the first viewport even when inert. The first
clear fixture passed without acquiring the target; adding explicit enhancement and an open-state
precondition exposes both failures. Preserve `ui-toast-document-constraints-negative.log`,
`ui-toast-document-constraints-expanded-negative.log` and the corrected six-failure log. The source
now applies target constraints to named actions while preserving direct APIs. Final verification
follows; no accepted current Toast checkpoint is claimed yet.

Changed-file ledger: `src/ui/toast.ts` owns the controller fixes; `test/ui-toast-document.test.ts`
holds public regressions; `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` add six browser modes. README documents user behavior. Component
architecture and runtime ownership define continuation, label, native interaction and resource
contracts. TESTING records evidence scope. PROGRAM_AUDIT, this owner ticket and umbrella 0033 retain
commands, failures and remaining work.

Commands:
`npx vitest run test/ui-toast-document.test.ts test/ui-toast.test.ts test/ui-toast-resource-lifecycle.test.ts test/ui-floating-labels.test.ts test/csp-entrypoint.test.ts`;
`npx vitest run test/ui-*.test.ts test/dom-realm.test.ts test/kernel.test.ts test/*bridge*.test.ts test/declarative*.test.ts test/testing-harness-conformance.test.ts test/access-manager-block.test.ts`;
`npm run typecheck`; targeted `npx eslint` on the four implementation/test paths above;
`node scripts/quality/check-lint-boundaries.mjs`; and Playwright on the document-ownership and
component specs with the three desktop projects and `[Tt]oast` selection. Use the canonical Node 24
PATH. Final full browser selection retains every predecessor family/control and adds Toast. The
final frozen-tree fast/browser reports and isolated build bindings belong in the ignored checkpoint
artifacts so recording results does not invalidate their inputs. Actual `npm run check` remains
required for the complete original audit.

The first frozen fast report `2026-09-21T17-48-25-619Z-30240` passes 4,495 units and 22 of 23 static
checks. ESLint alone rejects a viewport variable assigned once after declaration. Pass the resolved
viewport directly into the availability guard instead; this also lets named target constraints guard
viewport enhancement itself. No rule or allowance changes. Preserve the failed report and rerun
focused checks, lint and the full fast/browser gates on a fresh input snapshot. The final explicit
integration selection passes 3,098 cases across 104 files before this equivalent guard refactor.

Feed implementation now follows the accepted Toast checkpoint. Toast passes 4,495 units, all six
fast/23 static gates and 1,062 browser cases on 916 frozen inputs. The Feed controller and its
primary, article-association and resource suites have been reread. The expanded diagnostic has 76
assertions: 71 fail and five controls pass. One earlier foreign listener case passed without
acquiring a record; its corrected precondition now fails. Foreign/adoption assertions mostly stop at
ambient DOM-brand checks and must run again after that boundary is corrected.

Promote the formatted draft as `test/ui-feed-document.test.ts` and retain its fresh public negative
before controller changes. The existing Plan includes source changes to `src/ui/feed.ts` and a
private owner-document argument from `src/ui/index.ts`. Use the existing UI resource primitives,
with local guarded source/label writes; the separate shared-acquisition findings are not silently
folded into this change. Preserve all existing observer replacement/reentry controls and add state
checks for observation acquired after disposal. Changed-file ledger initially includes this ticket
and the new public Feed suite; the planned controller, private factory, browser and documentation
files will follow. No API, allowance, budget, exclusion or frozen CSP inventory change is
authorized.

Feed public negatives reproduce 71 failures/five controls. The controller now uses native DOM
brands, a private owner-document argument, current source/part guards, request revisions and
provisional UI resources. `test/ui-collection-resource-lifecycle.test.ts` now expects the second
disconnect after interrupted observe returns; the new public resource-state test proves why the
earlier disconnect is insufficient. The first focused run records an absent-status setup error (10
association failures and unhandled errors) and that obsolete disconnect count. Both are fixed. Type
checking identified the absent saved record; lint required an AggregateError cause.

All 171 focused cases then pass. Follow-up cases add direct source reads during before-load,
provisional constructor delivery and source changes during listener acquisition, exposing six
failures. After correction, 185 focused cases pass. Two more cases reproduce observation acquired
after disposal when observe subsequently throws; retire that late handle in the error path too.
Preserve each negative log. The public suite now has 92 cases and verification continues.

The measured Feed non-null and unnecessary-type-parameter allowances are obsolete and removed from
`quality/lint-boundaries.json` (two and one occurrences respectively). Callback-state checks are
expressed through current-state predicates without raising the unnecessary-condition allowance. No
baseline or rule increase. This adds the resource test and lint inventory to the changed-file
ledger. Browser and documentation changes remain planned before final frozen-input acceptance.

Feed verification now passes 203 focused tests with 96 public document cases. The final selection
includes the native DOM-realm controls; earlier 187-test focused evidence remains retained. The
broader integration selection passes 3,194 cases across 105 files after the last four action tests.
Their negative reproduces two ID-target/default-message failures; the existing explicit ID-selector
form is restored and element-target controls remain passing. Types and lint failures remain recorded
with their corrections, including TypeScript's impossible-type narrowing for alternative native
constructors.

All 24 focused browser cases pass after correcting an entry-realm assumption. The first browser run
records six Chromium failures and 18 passes. A three-engine diagnostic proves correct delivery,
current sentinel and completed loading: Chromium uses the callback realm for entry objects, while
Firefox/WebKit use the observer realm. Keep native identity checks for both realms and exact target
checks. No runtime observer change was needed for that failure.

The changed-file ledger now includes `src/ui/feed.ts`, its private factory call in
`src/ui/index.ts`, `test/ui-feed-document.test.ts`, the collection-resource test,
`quality/lint-boundaries.json`, both browser fixture/spec files, README, component/ownership/testing
brain docs, PROGRAM_AUDIT and owner/umbrella tickets. Shared resources, public signatures, budgets,
API baselines and frozen CSP remain unchanged. Use the current-source isolated runtime build for
size measurements; it does not prove package/declaration/installed-consumer delivery. The fixed
limits remain required.

Commands and evidence under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npm run ticket:validate -- --phase plan --ticket docs/tickets/0006-make-lifecycle-transactional.md`
  passes in `ui-feed-document-plan.log` before source changes.
- `npx vitest run test/ui-feed-document.test.ts` preserves the original, follow-up, late-observer
  and action negatives. `ui-feed-document-focused-fifth.log` passes 203 cases across six files.
- `npx playwright test e2e/ui-document-ownership.spec.ts e2e/components.spec.ts` with all three
  desktop projects and the Feed/established-controls selection passes 24 cases in
  `ui-feed-document-browser-focused-second/results.json`.
- `npm run typecheck`, targeted ESLint and the exact lint ratchet retain all intermediate logs.
- `measure-ui-feed-isolated-preview.mjs` uses all unchanged Vite entries/configuration and keeps the
  root distribution untouched. Its measurement binding must verify source and emitted maps.
- `run-ui-feed-browser-final.mjs` selects all document cases and every prior accepted component
  control, plus both Feed controls. The final browser report and `npm run quality:fast` must match
  `ui-feed-document-final-inputs.json`; acceptance is recorded in
  `ui-lifetime-continuation-state.json`. No full-goal closure follows from this checkpoint.

The first full Feed fast report `2026-09-21T18-32-24-347Z-70511` passes all 23 static gates and
4,589 of 4,591 units. Two enforced contracts fail: Feed used `releaseObserver`, a property reserved
for private runtime minification, and its browser fixture introduced an inline expression into the
frozen public-expression inventory. Preserve the report and the matching 1,086-case browser pass.
Rename the private Feed field without changing its behavior. Construct the test-only click binding
through the same native setAttribute setup used by the other independent-window action fixtures;
retain real declarative action dispatch and backend-loading controls. Do not change the mangle
allowlist, scanner, frozen inventory or test expectations. Re-run both contract tests, source-bound
build/maps and the complete frozen fast/browser gates on a new snapshot.

Both full-gate failures are corrected under that Plan. The focused contract selection now passes 208
tests in eight files, including the CSP inventory and private-property restriction. The frozen
inventory remains unchanged. The second isolated all-entry build verifies 120 source hashes, 74
emitted files and 108 source-map contents. Its binding and new frozen snapshot must match the second
complete browser/fast reports; the first matching browser pass remains historical. The explicit
3,194-case integration run predates only the equivalent private-field rename; the final complete
unit report must verify every selected integration case again. Evidence names use
`ui-feed-second-*`, `ui-feed-document-final-second-inputs.json` and
`ui-feed-document-browser-final-second/`. No contract, limit, exclusion or allowance was relaxed.

A final Feed identity review reproduces duplicate generated article/title IDs after removing an
article and appending another. Both local and foreign cases fail; ordinary append controls pass. The
existing index-based identifier is reused by the new item and its title, so native ID lookup can
resolve the wrong label. This must be corrected before accepting Feed. Extend the current Plan with
a local guarded ID allocator for generated root/article/title/description IDs. Preserve authored
IDs, prefer the existing ID shape, and select an unused suffix when a preferred ID already exists in
the owning document or the detached Feed subtree. Keep all native-write/source/revision guards. Add
public remove/append, prepend, external authored-collision and title/description collision cases
with exact native label lookup checks. No global helper, API, inventory or budget change.

The ignored four-case negative is retained as `ui-feed-identity-crosscutting-probe.log`, with its
source/test/config binding. The second frozen fast unit report passes 4,591 cases before this
additional correction; keep it historical, then bind final focused/full checks and a new isolated
all-entry build to the identity-corrected input set. Existing 90-case Resizable/Sortable diagnostics
and their ignored Plan draft remain preparation for the next two families.

The public identity suite reproduces ten failures and 98 controls before the allocator change. The
corrected focused selection passes 220 cases across eight files. The public Feed suite now has 108
cases. Browser fixtures add removal/append identity and native label lookup checks without changing
the number of selected cases. The final source-bound preview uses
`ui-feed-identity-isolated-preview/`, and the definitive snapshot is
`ui-feed-document-final-identity-inputs.json`. The final complete unit report must verify all 3,206
current integration-selection cases across 105 files. Keep earlier source-bound previews, passing
fast reports and failing diagnostics as versioned history.

### Calendar and picker documents: continuation (2026-09-21)

The accepted Chart/Data Table checkpoint passes 4,139 units, 2,755 integration tests and 912 browser
cases. The Calendar continuation starts from 20 failing document assertions and eight failing Date
assertions in the ignored September 19 audit directory. These demonstrate foreign element and Date
rejection, application-root action resolution, adopted native-part rejection, selection after
callbacks disable dates, canceled native activation, nested-controller navigation, stale replacement
grids and the Date.UTC century offset for ISO years below 100. Adoption probes currently stop before
native behavior, and the Date probe uses a separate JavaScript realm. Add real browser evidence for
both. These assertions are not counts of distinct vulnerabilities.

Promote and expand public regressions in `test/ui-calendar-document.test.ts` before changing
`src/ui/calendar.ts`. Use shared DOM brands and resource helpers, captured documents/windows,
current required and optional parts, and request revisions established before setup or parsing.
Retire records before listener cleanup and respect a replacement acquired during reentry. Preserve
unchanged rendered day identity and roving focus through enhancement and adoption. A render must
guard live writes and only cache completed output. Replaced or emptied output must be repairable,
and read-only facade calls during rendering must not recursively render. Current source state and
constraints must be checked after callbacks and live writes, including clear and navigation paths.

Native activation and named actions honor cancellation, disabled/inert ancestors, current controls
and nested controller ownership. Resolve action selectors inside the application, including its
root, and bind private action paths to the installation document via `src/ui/index.ts`. Direct APIs
retain their programmatic contract. Accept genuine Date values across realms with native Date brand
checks and preserve four-digit ISO years in parsing and calendar arithmetic. Preserve the 42-day
grid, keyboard navigation, unavailable-date/range rejection, reverse-range normalization, native
form values, first-only seeding, canceled resets, queued focus and independent child scopes. Picker
writes and event chains must stop after replacement, disposal or newer intent. Event detail mutation
must not change accepted selection or the values propagated to native controls.

Planned files: the controller and private factory call above, the new public suite, existing
Calendar/resource suites if needed, both document-ownership browser fixture/spec files, README,
component/ownership/testing guides, this ticket, 0033 and PROGRAM_AUDIT. No shared helper change is
planned without separate evidence. Validate Plan, retain original negatives, then run focused and
complete UI/kernel/bridge integration, types/lint, browser coverage for all four families and a
fresh fast check on frozen inputs. Keep fixed package budgets, lint allowances and CSP inventory.
All remaining families, actual hosts, semantic review, package/API and manual accessibility work,
and full npm run check/delivery remain required. AC-34 through AC-37 remain unchecked.

The first public negative records 80 failures and six passing controls. The first correction passes
194 focused cases. Expanded reentry tests then expose 14 failures and one unhandled error when Date
Range Picker tries to reacquire its Calendar after disposal in an input setter. Guarding
render/native writes and separating read-only enhancement from newer requests passes 210 focused
cases. Six further failures cover next-month and picker requests during acquisition and native input
handlers directly patching the field. Their corrections pass 230 focused cases. Two disabled field
negatives require checking native picker fields for day activation and named actions while retaining
programmatic API availability. Two more negatives show facade adoption does not reclaim the child
Popover before source disposal. Pass the private Popover enhancer through the existing factory call
and guard its setup as part of picker ownership. This stays within the planned child scope contract
and changes no public signature. All logs use `ui-calendar-document-*` in the ignored audit
directory. These are intermediate results, not full group acceptance.

The 126-case public suite and Calendar/floating integration pass 619 focused cases. Complete
UI/kernel/bridge integration passes 2,881 tests across 101 files. Targeted browser proof passes all
81 cases: 72 new document cases and nine existing native/accessibility controls, across Chromium,
Firefox and WebKit. All 127 source and 913 worktree hashes verify at terminal session 50747, exit
zero. Types pass; lint requires an arrow wrapper for the private Popover enhancer. Two final public
negatives demonstrate duplicate picker notifications when an earlier Calendar change listener starts
a newer selection. Internal event ownership now stops the old event without exposing extra public
detail fields. All 128 public cases and 625 focused/resource/CSP tests pass. The new complete
browser run also includes the existing range/backend accessibility case omitted by the targeted
grep. Final integration, types/lint, fast and browser receipts remain required and must match the
written tree before checkpoint acceptance.

Eight additional negatives show native and named selection notifications continuing after a live
heading write disables the root. The request guard now also protects render continuation and native
notification, retaining direct API availability. All 136 public and 633 focused/resource/CSP cases
pass. Browser fixtures include this continuation check. Source parsing follows request intent, and
Date brand checks skip string inputs. Final checks must cover these last changes as well.

The first final fast report, `2026-09-21T16-15-17-403Z-20184`, passes 4,274 of 4,275 units and all
static/format/workflow checks. API Extractor rejects a moved warning source-line reference in the UI
report; the diff contains no public signature change. An isolated declaration build with the
unchanged API baselines passes after the factory receives the existing private Popover collection
directly. Apply only those two verified source files. This avoids an extra API object and preserves
the original call-site layout. The unfinished full browser run is intentionally interrupted with
SIGINT at verified runner 20199, terminal session 40599 exit 130, before source changes. Retain its
partial report and all startup hashes as diagnostic evidence. Fresh browser and fast runs must cover
the corrected factory wiring; no baseline, warning allowance or budget is changed. Complete
integration already passes 2,891 cases across 101 files before this private wiring simplification.

Changed-file ledger: `src/ui/calendar.ts` owns all controller corrections and uses existing shared
DOM/resource helpers. `src/ui/index.ts` passes the installation document and private Popover
enhancer. The public Calendar document suite retains negative/positive cases; both document browser
fixture/spec files add six modes per family. README, component/ownership/testing guides, this
ticket, 0033 and PROGRAM_AUDIT document behavior, commands, evidence and outstanding scope. No
shared helper, public signature, allowance, budget or frozen CSP digest changes. Commands use
canonical Node 24/npm 11: focused Vitest selects the Calendar, range, lifecycle, resource, new
document, floating document/resource and CSP suites; complete integration selects
`test/ui-*.test.ts` plus DOM/kernel/bridge/declarative/harness/Access Manager tests. Browser
commands select the document ownership fixture and existing component controls across the three
desktop engines. TypeScript, ESLint, lint-boundary, Plan, formatting, spelling and diff checks
precede fresh quality:fast.

### Chart and Data Table documents: continuation (2026-09-21)

The saved viewer checkpoint still matches all 911 worktree inputs. The next group starts from 20
isolated diagnostic failures recorded in `ui-chart-table-continuation-review.md` under the ignored
September 19 audit directory. These include foreign-document guards, root-as-application actions,
nested parts, stale output, newer page/filter intent, constrained or canceled native events, cleanup
reentry and interrupted Chart render caching. Listener churn alone is an observation; duplicate sort
notifications are the behavioral regression. The adoption probe stops at a table constructor guard,
so both disposal orders still need direct coverage.

Promote the diagnostics to `test/ui-chart-table-document.test.ts` and extend public regressions
before runtime edits. Use independent iframe documents without changing global constructors. Capture
document/window and current required/optional parts with the existing UI resource helpers. Retire
the previous record before releasing its listeners, respect any record acquired during cleanup, and
publish ownership before acquiring resources or writing live metadata. Preserve native table/plot
identity and accepted logical state on unchanged enhancement and adoption. Retain Data Table
selection, initial-only seed history, original row order and filter through retirement. Copied API
outputs and event details must remain detached from internal mutable state.

Every request and continuation must respect current owner, parts, configuration and newer intent.
Chart builds detached output and only caches a completed render; cancellation, throwing writes and
reentry must leave a later valid render possible. Data Table refreshes current parts on facade
access, keeps one effective native binding set and stops sort continuation after newer page/filter
requests. Native events and named actions respect cancellation, disabled/inert ancestors and nested
controller ownership. Direct APIs retain their documented programmatic behavior. Action selectors
must resolve within the application including the root itself, preserving existing argument forms.
Do not change public signatures, native captions, numeric validation, stable ordered multi-sort,
proposed before-sort state/cancellation, manual processing or off-page selected ID behavior.

Planned files and changed-file purposes: `src/ui/chart.ts` and `src/ui/data-table.ts` own the
controller corrections; the new public suite and existing family/resource suites prove regressions
and positive contracts. Extend `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` for real Chromium/Firefox/WebKit proof. Update this ticket,
0033, `docs/PROGRAM_AUDIT.md`, component/ownership/testing guides and public README lifecycle prose.
Remove obsolete entries from `quality/lint-boundaries.json` only when measured; no new allowances,
budget increases or test exclusions. No shared helper change is planned without a separate validated
need. Validate Plan first, preserve failing runs, then run focused suites, complete UI/kernel/bridge
integration, types/lint, the complete browser cohort and fresh fast verification against unchanged
inputs. Current package/API budgets, actual host matrices, semantic review, manual accessibility and
full npm run check/delivery remain required by the full audit.

The initial 45-case public negative records 41 failures/four passes and 29 recursion errors from
reading Chart data/type during before-render. Bound that fixture's nested reads while preserving the
duplicate before-render assertion: the second run records the same 41 failures/four passes without
unhandled errors. Both logs remain in the audit directory. Plan validation passes. Chart's
in-progress render identity must suppress recursive read-only enhancement, while newer mutating
requests supersede earlier continuations. Keep retained output identity separate from a committed
source signature so cleared output and failed writes are retried. These details stay within the
planned current-output/reentry contract. No Data Table runtime edits yet.

The first Chart correction passes 202/fails 22 focused cases, all remaining failures in Data Table.
The expanded 62-case public negative records 32 failures/30 passes, including a newer unchanged
Chart type request, disposal during table reordering, retained selection seed history and stale
controls. Both controllers then pass all 241 focused cases and all 2,742 integration cases across
100 files. Focused lint passes; TypeScript identifies a nullable table-query return to normalize.
This is intermediate evidence, not the final group checkpoint. Additional public cases exercise
direct configuration/source patches during before-sort, newly constrained native activation and
authored disabled controls. Retain those negatives before correction. Data Table needs guarded
configuration/source snapshots as well as revision/current-parts checks, and must distinguish its
own disabled reflection from authored constraints. Read-only facade calls during proposed sorting
must not commit row order before cancellation. Continue preserving public signatures and scope.

Six configuration/constraint negatives pass after guarded source snapshots and retained authored
disabled state. Three later action negatives require rechecking constraints after callbacks and
rolling back a still-owned sort proposal when its trigger becomes disabled. Their correction passes
255 focused/CSP cases; TypeScript and focused lint pass. The private action path also needs the
installation's captured document, not the adopted application's current document. Add
`src/ui/index.ts` to the manifest solely to pass that document to both private controller factories;
this preserves the facade's existing ownership boundary without a public signature change. Public
tests cover source actions after application adoption and partially seeded selection after failed
initial row validation. Initial selection seeds must commit only after complete row validation.

The final 75-case public suite and all 258 focused/CSP tests pass. Complete UI/DOM/kernel/bridge and
Access Manager integration passes 2,755 tests across 100 files. The targeted browser selection
passes all 48 cases across Chromium, Firefox and WebKit with no skips/flakes; all 127 source inputs
and 912 worktree inputs verify at terminal session 6128 (exit zero). TypeScript, focused lint and
the unchanged 345-file/286-entry allowance inventory pass. `ui-chart-table-*` logs in the ignored
September 19 audit directory retain every negative and corrective run. The complete cohort and a
fresh fast report remain required before accepting this group's checkpoint. Neither closes this
owner's full acceptance criteria or the remaining audit scope.

Changed-file ledger: `src/ui/chart.ts`, `src/ui/data-table.ts` and `src/ui/index.ts` implement the
captured controller and private action ownership; `test/ui-chart-table-document.test.ts` contains
the public negative/positive cases. Both document browser fixture/spec files add six modes per
family; existing native/server/accessibility component cases remain controls. README, component,
ownership and testing guides document the behavior; 0033 and PROGRAM_AUDIT record scope and limits.
No shared resource helper, public signature, lint allowance, budget or frozen CSP digest changes.
The current all-entry isolated build still exceeds fixed package limits; it leaves root distribution
runtime files historical and supplies no declaration/API or installed-consumer acceptance. Six
generated declaration files/maps differ from the earlier copy build; that mixed root distribution is
not a current package candidate. The first fast run passes units but fails Markdown formatting in
five edited files. Static checks are intentionally interrupted to format and rerun the final tree;
report `2026-09-21T15-34-23-303Z-82560` is an error, not checkpoint acceptance.

### Color Picker, File Upload, Tree and Transfer List documents: next group (2026-09-19)

The ignored `ui-color-file-tree-transfer-probe.test.ts` records seven failures and one passing
control without unhandled errors. Every family rejects its own foreign-document facade target. Color
Picker swatch selection, Tree row selection and Transfer List add fail immediately after destination
enhancement and source disposal. File Upload's simple adopted native change passes. The first probe
used Tree's default single mode with an array assertion; the corrected probe explicitly selects
multiple mode and retains the same outcomes. Preserve both logs.

Promote the corrected cases to `test/ui-color-file-tree-transfer-document.test.ts` before editing
`src/ui/color-picker.ts`, `src/ui/file-upload.ts`, `src/ui/tree.ts` or `src/ui/transfer-list.ts`.
Extend the existing browser fixture/spec to all four families. Review native identity, private
actions, captured document/window/form and current parts, immediate destination acquisition,
provisional setup, complete cleanup/reentry and callback revisions together. Complete current Tree
and Transfer List source reads before their detailed implementation. Keep their existing fixture and
native behavior as controls, including assigned order, selection/highlights, Tree expansion, roving
focus, typeahead, disabled protection, generated/hidden controls and reset behavior.

Color Picker must preserve native color/default values and native normalization, current text
drafts/selection/composition, invalid state, current constraints and nested swatches. Check owning
window capabilities for native color syntax instead of assuming identical support across engines.
File Upload must preserve actual native File objects and FormData, including replacement files with
identical metadata, empty native selections and real resets. Cover validation changes during
callbacks, drag state, nested removal/drop targets and current rendered lists. Real browser file
inputs/DataTransfer are required for reset/submission proof; test property overrides do not prove
that platform behavior. Source disposal cannot release destination resources or resume stale work.

Reuse the existing DOM/lifecycle helpers and record any concrete shared need before extending them.
Update public/brain guides and exact file/command ledgers. Run focused and complete UI/kernel/bridge
integration, all three engines and static/fast gates. These fixes do not close the full 50-family
review, actual host matrices, fixed budgets, semantic source/claim review or actual delivery.

Color Picker implementation ordering: promote the four-family probes, then extend Color Picker
regressions before its runtime change. Capture native control, text, preview, status and form
identity in `UIResources`; reuse the shared provisional listener/reset helpers. Preserve current
native values and text drafts, selection, composition and invalid state through unchanged
enhancement and adoption. Use native brands and owning-window events. An implicit action argument
beginning with `#` is a color when it is the only argument; an explicit target has a second value
argument. Protect before-change cancellation, native/model writes, no-op requests and notification
callbacks with revisions and current constraints. Color normalization must prove acceptance by the
native input, including black fallback, rather than treating CSS support as native input support.
Scope swatches to the current controller and retain authored disabled choices. No shared helper or
public signature change is planned. File Upload, Tree and Transfer List remain in this same group.

The first 61 public cases record 48 failures and 13 passing controls without unhandled errors. The
first Color Picker correction passes 188/fails 12 focused cases. Eleven failures belong to the other
three families; the Color Picker constraint signature incorrectly conflates an absent `alpha`
attribute with an empty one. Preserve null versus empty values in its serialized signature. Five
follow-up cases add nested native-event and late reset-handle controls, reproduce a root patch lost
during before-change and acquisition resumed after cleanup disposal, and expose a fixture assumption
that jsdom provides CSS. Stub and restore that capability explicitly. The corrected negative has 13
failures and 53 passes. Guard the root patch and owner availability before continuing; these are
within the existing revision and cleanup Plan.

All 18 initial Color Picker browser cases pass. A further native parser regression fails in all
three engines: CSS-wide keywords such as `inherit` pass CSS support checks and become the native
black fallback. Reject CSS-wide and context-dependent values after browser style parsing, retaining
literal colors supported by the native input. Preserve this browser negative and repeat the full
matrix. Include `quality/lint-boundaries.json` to remove Color Picker's now-unused one-condition
allowance. The late reset fixture needs a DOM Window type so its mocked numeric handle matches the
browser API; the initial TypeScript error remains in the ledger.

File Upload continuation: the ignored `ui-file-upload-followup-probe.test.ts` records five failures
for replacement File identity with identical metadata, silent native clearing, unchanged listener
identity, clearing a disabled control and stale cancellation restoring an older native selection.
The initial probe's deep equality did not distinguish native File objects; correcting it to identity
checks exposes the fifth failure. Preserve both logs and promote these cases to the existing public
four-family suite before changing File Upload. Property overrides only establish controller
behavior; real browser DataTransfer/FileList, reset and FormData proof remain required. Capture
current parts, form, document and native file identity. Render signatures may preserve list nodes
when metadata is unchanged, but they cannot substitute for the current native File objects. Complete
the planned callback, validation, drag-state, cleanup and adoption review with the fix.

File Upload detailed design: use a captured `UIResources` record and exact control/form/list/status/
dropzone ownership. Native File identity governs selection changes; metadata signatures only govern
rendered row reuse. Preserve exact listeners, list nodes and drag depth on stable enhancement and
adoption, while a weak retained record snapshot survives source disposal order. Native empty
selection remains authoritative. Own listeners before acquisition and keep reset microtasks guarded
by record, revision and late cancellation, preserving the existing reset timing. Scope removal and
drag events to this controller and validate accept/count/size/multiple again at callback boundaries.
The native single-file limit cannot be expanded by `data-max-files`. Newer no-op operations also
supersede older transitions. Event details must not expose mutable arrays used for the commit.

Use the owning window's DataTransfer for real FileList writes and guard constructor/item/write
callbacks. Never conceal a failed native write by installing a shadow files property. Existing
explicit array overrides used by controller fixtures may remain writable in environments without
DataTransfer, but are not native reset/submission evidence. Native clearing works without requiring
DataTransfer; partial changes that cannot be represented natively must fail explicitly. Update the
existing browser fixture/spec to prove actual File identity/content, FileList/FormData, clearing,
removal, reset cancellation, adoption, preserved drag/list state and resource retirement. Reuse
existing helpers without changing public signatures or increasing lint allowances.

The expanded File Upload negative has 44 failures/65 passes plus one asynchronous fixture error: a
removal fault can reach later automatic enhancement after the assertion. Restore that mock in a
finally block and require actual retirement; the corrected negative records 45 failures/64 passes
without unhandled errors. First focused correction passes 194/fails eleven across five files,
including three drop fixtures without a files override in jsdom. Explicitly initialize those
controller-only arrays; actual browser fixtures use native DataTransfer. Four follow-ups then show
two passing native-write controls and two failures: old cleanup overwrites newly acquired drag
state, and adoption retains an old rejection after silent native replacement. Retire drag state
before listener cleanup can reacquire ownership, and retain errors only for the same native File
objects. Preserve the 10-failure/103-pass follow-up negative. No shared-helper change is needed.

The corrected focused run passes 201/fails eight in five files. All 51 File Upload and 54 Color
Picker public cases pass; the eight failures belong to Tree and Transfer List. All 18 new browser
cases pass across three engines using actual FileList, File contents and FormData, including a check
that no shadow files property was created. Lint rejects an unnecessary File cast in the browser
fixture and a constructor-only test double; remove the cast and assert the double's item writer was
not reached after disposal. The ratchet identifies three removed unnecessary conditions. Include
`quality/lint-boundaries.json` to remove that allowance, without adding replacement exceptions.

Tree continuation: the ignored `ui-tree-followup-probe.test.ts` records six failures without
unhandled errors: older selection overwrites a newer before-select operation, collapse ignores
changed disabling, a typeahead timer returned after disposal is not canceled, composing text keys
move focus, listener registration can leak after registering then throwing, and one cleanup failure
prevents the rest. Promote these cases to the existing public group before changing
`src/ui/tree.ts`. Use captured document/current item-row-group-label identity and provisional
resources. Rename the active-item field when adopting `UIResources` so its boolean active flag
remains distinct. Retain selection, expansion, roving focus and typeahead/expiry through stable
enhancement and adoption; validate native nested interactions, generated versus authored names,
constraints and callback revisions together. Complete source reads are recorded in the review notes.
Transfer List and all remaining family/host/semantic/fixed-budget/delivery scope remain required.

Tree detailed design: capture exact item, row, group, label and parent identities plus selection
mode and document in `UIResources`. Stable enhancement retains exact bindings, active exploration
and pending typeahead. A weak snapshot retains active item/value, search text and expiry across
record replacement and either source disposal order. Own timer/listeners before native acquisition,
release late handles, sweep failed cleanup and stop outer facade work superseded during acquisition.
Native brands and owning-window events replace ambient checks. Revisions cover no-op selection,
expansion, focus, bulk selection, sibling and ancestor loops, including live value/disabled/mode/
expanded changes in callbacks. Native focus callbacks can supersede pointer or Shift+Arrow work.

Keep root values authoritative, selected order in DOM order and hidden/disabled selections during
visible select-all. Preserve single/multiple/none semantics and native nested controls. Ignore
composition and unrelated modifier shortcuts. Use existing generated-attribute helpers to preserve
authored names and clear generated disabled state when data-disabled is removed. Render current
hierarchy/labels without adding form fields. Extend real browser proof for active focus, retained
search/expansion, current parts, private actions, cancellation and adopted/preserved ownership. No
shared-helper or public API change is planned; Transfer List and the complete audit remain open.

Tree implementation evidence: the public negative suite finishes with 47 failures and 113 passes (43
Tree, four Transfer List), without unhandled errors. The first implementation passes all new Tree
cases; the existing ancestor-disposal test detects an expansion-order regression. Preserve
nearest-ancestor-first expansion. Four further public negatives demonstrate direct DOM changes in
expansion callbacks continuing an older sibling/focus loop, disabled span toggles selecting and
expanding, and disabled child focus expanding ancestors. Stop those continuations and validate the
entire existing Tree and collection suite. TypeScript also identifies the owning-window constructor
cast, and lint rejects a non-null assertion; correct both without new exceptions.

Tree follow-up review checks original typeahead expiry after adoption near its deadline and rejects
an old timer callback once a newer query exists. Keep fresh-key scheduling at 500 ms and use only
the remaining interval when restoring a retained query. Acquisition also needs to reject an outer
facade operation when listener setup directly patches root selection. The public late-listener
control covers disposal before native registration returns. Preserve all negative/static logs and
verify the final source after the timer parameter correction.

Transfer List follow-up: its complete 550-line controller and existing family tests were reread.
Eight ignored probes fail without unhandled errors: newer membership is overwritten in
before-change; event arrays mutate the pending commit; native select disabling is ignored after the
callback; input reentry leaves an extra stale change event; generated aria-disabled stays sticky;
authored button disabling is cleared; registration-then-throw leaks; and one removal failure skips
remaining cleanup. Promote these before runtime edits. Preserve assigned order, current native
highlights/defaults, generated submission fields and exact string identity while defining native
reset synchronization from the existing controls. Complete document/current-part/provisional
resource coverage and original family/host/semantic/fixed-budget/delivery scope remain required.

Transfer List detailed design: use `UIResources` before native listener acquisition, with captured
selects, actual form owners, buttons/operations, status and document. Operation snapshots include
exact options, generated fields, ordered native values/highlights/defaults and live constraints.
Stable enhancement preserves bindings, option nodes/highlights and generated hidden inputs. A weak
reflected-value cache distinguishes an explicit root patch from silent native membership changes;
root patches are authoritative, otherwise current native membership/order survives adoption and
source disposal. Root intent guards facade acquisition and cleanup reentry. Record revisions guard
no-op requests, cancelable component events, native input/change and setup callbacks.

Own provisional listeners and queued native reset work through current shared helpers. A native
reset changes native highlights to option defaults while retaining assigned membership and ordered
hidden values; it emits no synthetic membership events. Capture both select form owners, retain
accepted reset work during stable enhancement, and reject canceled, superseded, retired or
reassociated work. Preserve disabled option membership on set and exclude disabled options from
explicit reorder requests. Disabled native selects/fieldsets or roots block UI mutations. Generated
hidden fields reflect unavailable state and disabled assigned options for ordinary FormData
exclusion. Explicit HTML/root patches may still replace membership. Render native defaults without
turning a current highlight into a new default.

Track generated button disabling separately from authored disabling; use shared generated-attribute
ownership for root ARIA. Scope controls to the nearest controller; native buttons carrying the
styling-only `data-jqs="button"` marker remain parts of that controller. Preserve canceled native
clicks, composing/modifier Enter and nested controls. Clone event arrays so observers cannot alter
pending values or later event details. Native brands and captured-window constructors cover foreign
facades/private actions and events. Extend the public group before source edits, then current
family/resource/value/form checks, all three browser engines, complete integration/static/fast and
the existing public/brain guides. No shared-helper/public-signature change or increased lint/budget
allowance is planned. All remaining family/host/semantic/fixed-budget/delivery scope stays open.

The first final fast run (`2026-09-19T19-26-51-534Z-31128`) catches an Access Manager regression:
generic nearest-data-jqs scoping excludes its styled native buttons, so Add leaves membership
unchanged. Add all six styled-button operations and an SVG descendant regression before correcting
part and event ownership. Retain nested controller exclusion and use the same styled markup in the
browser fixture. The same run reports the now-unreferenced `listenToFormReset` export. Remove that
obsolete internal helper from `src/ui/lifecycle.ts`; all callers already use owned reset resources.
This extends the planned-file manifest to that deletion without adding a helper or public API.
Repeat the Access Manager integration, complete UI integration, browser matrix and fast gate.

Transfer List negative evidence: 47 failures/171 passes plus six observer errors from stale-control
mutations corrupting native option membership. Strengthen the replacement cases to assert actual
native lists and remove corrupted fixtures in finally blocks. The corrected public negative has 49
failures/169 passes without unhandled errors. First runtime correction passes 279/fails three across
four files. Restore Enter activation after preventing its native default. Reset inspection proves
jsdom's selectedOptions collection remains empty despite option.selected becoming true; read native
option.selected flags directly and retain real-browser reset proof. Four follow-ups cover SVG button
descendants, newer reset membership, form reassociation and replaced-option notification retirement.
Include `quality/lint-boundaries.json` to remove the thirteen unused non-null assertions, with no
replacement allowances. Preserve every negative and inspection log.

Transfer List final controls: all 286 focused cases pass after Enter and native option.selected
corrections. One added native-option double-click test then fails; accept events targeted at an
owned direct option as well as its select. Final focused count is 287 across four files, including
all 223 public four-family cases. The browser fixture verifies actual reset, FormData exclusion,
both private-action forms, SVG button clicks, option double-click, Enter/reorder, current parts,
preserved membership/highlights/fields and both source-disposal orders. All 18 targeted cases pass.

### Popover, Tooltip, Hover Card, Menu, Context Menu and Menubar documents: next group (2026-09-19)

The next ignored twelve-case probe fails every foreign facade and native trigger after adoption/
source disposal. Correct the Context Menu call to its numeric x/y signature and make Tooltip content
noninteractive; the final negative retains twelve failures without unhandled errors. Preserve all
three logs. Before changing runtime behavior, promote the valid probes and read each complete
controller plus shared floating/native-popover boundaries and existing resource/cancellation tests.

Review private actions, captured document/window/parts, active-record sets, listener/timer/geometry
ownership and current native popover transitions together. Preserve open state, focus/exploration,
menu checked values, context coordinates, typeahead, hover/focus delays and remaining deadlines
through stable enhancement/adoption. Cover both disposal orders, reentrant acquisition/cleanup,
complete release, live constraints, canceled native opening/closing, nested/native interaction,
authored/generated accessible names and callbacks choosing newer state. Extend the current browser
fixture/spec and full integration/static/fast evidence. Reuse existing helpers unless a concrete
shared need is recorded before changes. This group and all remaining family/host/semantic/fixed-
budget/delivery work stay required; ignored discovery adds no semantic-review credit.

Continuation review reads all five controllers and `src/ui/floating.ts` (2,253 lines), plus the
complete floating resource and generated-label suites. Notes and source hashes are in
`ui-floating-document-review.md` and its input binding under the audit evidence directory. Cached
records lack captured-document validation; resources are published after registration, and shared
cleanup can stop on its first failure. Native show acceptance, same-record newer work, geometry/
focus callbacks and retained open/timer/search state still need public negative controls. Promote
the twelve valid discovery cases to `test/ui-floating-document.test.ts` before runtime changes.
Complete the family/action/transition tests' source review before implementation. Preserve Menu's
documented focusable-but-inactive disabled items and normal disposal's closed, silent panels while
testing retained state on adoption separately. These observations do not add validated findings or
completed semantic-audit credit.

The follow-up probe validates twelve more failures: every family resumes an older open after a
before-open callback requests close, and every family fails to release a listener registered just
before acquisition throws. Promote both groups to `test/ui-floating-document.test.ts` before runtime
edits. The complete six family/action suites, shared floating tests and transition-cancellation
tests were also read; native method stubs do not prove actual browser acceptance or late toggle
behavior.

Popover goes first within this group. Replace its mutable cleanup array with a captured
`UIResources` record published before listener acquisition. Capture document, exact direct trigger/
content and declarative click ownership; scope titles and native events to this controller. Retain
open state and owned focus across adoption, including source disposal before destination
acquisition, while ordinary removal/disposal still closes silently. Stable enhancement retains
listeners and current focus. Root intent spans setup/cleanup reentry; record revisions and live
constraints guard before events, no-op requests, native show/hide, geometry and focus callbacks.
Reconcile interrupted native calls with the current owner of that exact content and check actual
native open acceptance. Use owning-window events and native brands for facades, private actions and
global dismissal.

Use existing lifecycle, generated-name and floating-position helpers without extending shared
behavior for this first controller. Planned files are `src/ui/popover.ts`, the new public suite,
existing browser fixture/spec, affected component/ownership/testing guides and the owner/audit
tickets. Extend public negatives before implementation, then run focused family/resource/calendar
checks, complete UI integration, all three engines and static gates. Preserve the other families'
public failures; no exclusions, public signatures, raised budgets or new lint exceptions. The full
audit and actual check/delivery gate remain required.

Native browser follow-up exposes a render-boundary focus ordering bug. All three engines lose the
native panel on temporary removal; Popover enhancement must restore its accepted open state.
Chromium then emits `focusout` while the root is still connected and the panel still reports open.
The kernel already captures preserved focus, but attempts restoration synchronously before UI
enhancement reopens the panel, so the native focus call has no effect. The recorded focus trace
distinguishes this from an explicit blur, which must remain respected during adoption.

Extend this manifest to `src/kernel.ts` and `test/ui-preserved-focus.test.ts`. Keep the existing
synchronous focus restoration. Retry only an ineffective attempt after the enhancement settlement,
while the same render remains latest, its kernel is alive, the target remains connected in the
captured document, and no other element has taken focus. Stop after that retry and report its errors
through the existing enhancement barrier. Add failing generic focus-readiness coverage and newer
focus/render controls before editing the kernel, then repeat the real native preservation matrix. No
new plugin capability or public signature is needed.

### Tooltip document and delayed interaction continuation (2026-09-19)

The verified Popover checkpoint leaves four public Tooltip failures: foreign facade, adopted native
activation after source disposal, older open after a newer close, and listener rollback. Re-read
Tooltip, existing delay/description tests and shared resource helpers before extending public
negatives. Use a captured `UIResources` record, current direct parts and native brands. Publish
ownership before listener/timer acquisition. Preserve authored description tokens, remove only the
generated association and refresh it when the content ID changes.

Retain open state, pointer/focus activation and an absolute pending open/close deadline across
stable enhancement and adoption in either disposal order. Cancel old physical timers in their
original window; resume only the remaining delay in the new window. Every timer has provisional
cleanup and an identity that invalidates queued callbacks after cancellation or replacement. A newer
API request, including a no-op, must supersede older delayed/native/event work. Preserve
noninteractive content and no focus movement, live constraints, canceled native opening, actual
native toggle state, native show/hide reentry and silent ordinary disposal. Current geometry must
stop after callbacks choose newer state. Reuse existing lifecycle and positioning helpers; record
any concrete shared extraction need before changing shared code.

Planned files: `src/ui/tooltip.ts`, `test/ui-floating-document.test.ts`, existing browser fixture/
spec, component/ownership/testing guides and owner/audit tickets. Add failing controls before
runtime edits, then run focused Tooltip/floating/Popover tests, native browser proof in three
engines, full UI/kernel/bridge integration, static and fast gates. Other floating families and every
remaining family/host/semantic/fixed-budget/delivery requirement stay open. No public API, new lint
allowance or raised ceiling is planned.

Native-state follow-up extends this manifest to `src/ui/popover.ts`. Inspect the interval after an
authored native show but before toggle delivery: a facade close must read actual native openness.
Prove that interval for both Tooltip and Popover before changing behavior. Also check Tooltip toggle
reconciliation when canceling its pending timer synchronously requests newer state. A callback must
not resume with a stale native-state snapshot. Keep in-flight native operation depth distinct from
settled native state so newer no-op requests during native show/hide still win. Existing browser
inputs stay frozen until their running verification finishes; then extend native browser controls
and repeat relevant verification on the corrected source.

### Hover Card continuation after Tooltip (2026-09-19)

Four public ownership/acquisition/supersession failures remain in Hover Card. Re-read its complete
controller and family tests after the Tooltip correction. Extend the public controls before runtime
edits. Preserve interactive content, current scoped titles and authored names, open/pointer/focus
state, original remaining delays, focus within content across adoption and suppression of reopening
when dismissal returns focus to the trigger. Explicit blur, actual nested keyboard interaction,
no-op callbacks, focus callbacks and either disposal order need separate controls.

Use current document/direct parts, provisional listener/timer cleanup and guarded native
transitions. Validate settled native show/close and hide/reopen before toggle delivery, coalesced
native events, replacement content and cancellation during timer cleanup. Keep ordinary disposal
silent. The next source review must also test native content changing controller kind during a
callback: component- local reconciliation may not identify a new owner of another kind. This is a
source-level candidate, not a validated finding. If a public negative establishes a shared ownership
need, record the extraction design and all affected controllers before extending
`src/ui/floating.ts`.

Planned files are `src/ui/hover-card.ts`, the public floating suite, existing browser fixture/spec,
component/ownership/testing guides and owner/audit tickets; add any validated shared change to this
manifest before implementation. Run family/native/resource/focus/title tests, real browsers and
complete integration/static/fast evidence. Menu, Context Menu, Menubar, every other family and the
full host/semantic/fixed-budget/delivery scope remain required.

### Shared native content ownership after validated handoff failures (2026-09-19)

Four public regressions now prove that Popover/Tooltip show or hide completion can override a newer
owner of the same content after a callback changes the controller kind. The 103-case public suite
has 20 failures/83 passes; sixteen belong to the four unfinished families. The method-stub negatives
establish controller continuation, not actual browser acceptance. Add native browser handoff
controls.

Extend the manifest to `src/ui/floating.ts`, `src/ui/popover.ts` and `src/ui/tooltip.ts` alongside
Hover Card. Add a weak content-owner index holding the current resource record, liveness/revision
predicate and state reflection callback. Claim the content before retiring the previous owner so
reentrant cleanup sees current ownership; release the claim only if it still matches. Retire prior
physical resources and guard old state writes against a current content owner. Publish the record
before claiming content, and preserve newer setup-time intent when enhancement resumes.

Share the native-open query and interrupted-call reconciliation across the enrolled controllers.
Reconciliation reads the current content owner after every native callback and honors its latest
revision/state, including a newer request made while correcting an earlier native call. A stable
native rejection reflects closed state instead of retrying indefinitely. Keep component events,
constraints, focus, metadata and interaction scheduling in the controllers. Existing legacy Menu
helpers remain until those families are migrated. No new public API, lint allowance or increased
budget is planned. Add failing recovery-reentry controls before implementation, then repeat all
current Popover/Tooltip tests and real browser controls before accepting the extraction.

The first real browser handoff matrix passes all six closing cases and fails all six opening cases.
A new owner tries to show content while the old native show is still in progress; the platform
rejects that nested native transition. Extend the shared boundary with a per-content native-call
marker. New requests update desired state while a call is in progress and defer native work until it
returns. Preserve accepted open/close completion work in transient revision-bound callbacks so
positioning, focus and lifecycle events run only after native acceptance. Reconciliation drains
those callbacks against the current owner and rechecks any newer requests they make. Cleanup drops
pending completions. Stable native rejection still settles closed without retries. The native-state
recovery test should identify the recovery call by actual native state, not by an assumed count of
nested platform calls. Add explicit new-owner notification assertions before the implementation.

The first Hover Card browser selection has 62 passes and ten failures. Nine adopted-mode failures
start when the fixture deliberately moves focus outside a zero-close-delay card without pointer
entry; correct that fixture to test a fresh native entry after retained focus is asserted. The
remaining Chromium action-mode failure is a runtime bug: native removal sends `focusout` while the
root and native panel are still connected/open, then its queued close runs while the root is
detached and destroys preserved state. Record whether delayed interaction began connected and
suppress its continuation if that formerly connected root is detached when it fires. Keep explicit
detached acquisition supported. Add a public negative before the timer correction and retain the
native trace; preserved focus still belongs to the existing render transaction.

The first fresh fast run identifies the now-unreferenced `identifyFloatingTitle` export as its only
static failure. Both former consumers now resolve current scoped titles directly. Remove the
obsolete wrapper, retaining the shared naming primitives used by Dialog, Feed and Toast; repeat
current-source verification without an unused-code exclusion.

### JSON Viewer and Log Viewer document/continuation work (2026-09-19)

The prior copy checkpoint passes current fingerprints, 3,994 unit tests, 822 browser cases and all
fast gates. Full reads of both viewer controllers, family and part-lifecycle suites, resource
controls and component/type contracts lead to ten bound isolated failures. Promote them into
`test/ui-viewer-document.test.ts` before runtime changes, then expand the public evidence. Existing
render depth is an authored `data-max-depth` input; changing that input must refresh the projection
without inventing a new API or discarding native branch state when input is unchanged.

Planned files: `src/ui/json-viewer.ts`, `src/ui/log-viewer.ts`, the new public document suite,
existing viewer/resource tests as needed, the document browser fixture/spec, public README cleanup
notes, component/ownership/testing guides and audit/ticket ledgers. Lint inventory changes may only
remove obsolete exact allowances. Public signatures, named-action argument order, text-only output,
JSON null/circular-error behavior, defensive reads, native details, Log Viewer pause independent of
incoming data, severity filtering, bounded entries and current-viewport following remain required.

Use captured document/window resources and current part identities. Publish ownership before native
listener or queued-work acquisition. Reacquire adopted roots in either cleanup order; source cleanup
must not retire destination state. Preserve JSON disclosure nodes/state when source, parts and
rendering configuration are unchanged, and preserve Log Viewer pause/follow state. Facades resolve
current parts. Root request identity and revisions stop older serializer, lifecycle, native setter,
rendering and scroll continuations after newer work or retirement. Narrow JSON parse-error handling
to parse failures rather than treating arbitrary interrupted DOM work as invalid JSON. Retain each
serialization error for its caller even when its UI notification is superseded.

Follow-up review reproduces a stale in-progress signature after a nested expand/collapse request
from the tree insertion boundary. The newer request advances the revision, so the older render's
finally block skips clearing its marker. Returning to that original configuration then skips a
required render. Release the marker when it still belongs to that render, independently of revision,
while leaving committed-signature rollback subject to the revision check. Add both native expansion
directions as public controls and a browser recovery assertion. Preserve the isolated negative and
the interrupted browser run; neither supplies final passing evidence.

Tests cover foreign explicit/automatic/actions, root-as-application #/class/element targets,
replacement/nested parts, adoption and preserved/ordinary removal, current constraints and canceled
native events, initial enhancement reentry, serializer return/throw, branch setters, Log Viewer
before-append/clear ordering, input getters, provisional listener setup and complete cleanup. Queued
following must remain guarded by its owner and current viewport, including replacement and adoption,
while keeping the existing replacement-follow contract. Disabled user controls must not invoke
viewer actions; pausing announcements must never discard incoming entries.

Run focused family/resource checks, complete UI/kernel/bridge integration, all three native engines,
TypeScript/lint and fresh fast evidence. All 50 families stay enrolled. Remaining families, actual
Turbo/htmx hosts, fixed distribution/package limits, complete semantic review, manual accessibility
and actual npm run check/full delivery remain open. No view-controller observer, new public API,
raised budget or excluded failure is authorized by this work.

The first promoted public suite records **50 failures/nine passes across 59 tests**, without fixture
or unhandled errors (`ui-viewer-public-negative.log`). The failures establish foreign
facade/action/automatic paths, source-first adoption state, nested/current parts, serializer and
lifecycle ordering, live render configuration, branch setter interruption, provisional listener
ownership, inherited native filter constraints and queued-scroll ownership. Implement each viewer
with `UIResources`, captured parts, root request intent and operation revisions. Weak retained
snapshots contain data/parts only, allowing new document resources to preserve state without
retaining an old live owner. Preserve both open and closed JSON branches by path; read current
render depth and expansion configuration. Guard queued scrolling before and after layout reads and
release each native binding independently even if a different removal throws.

The first controller correction passes all 216 focused tests and TypeScript. Typed lint identifies
an empty Map without type parameters and an already-narrowed optional filter guard; correct their
types without an allowance. Extend public controls before further changes for constrained
named-action triggers, foreign filter/follow argument order, interrupted DOM rendering/retry,
reentrant listener setup/cleanup, late microtask acquisition and generated entry IDs while capacity
trimming. If the ID control fails, use a monotonic generated sequence while retaining authored IDs
and checking current-document/root collisions. Do not infer inaccessible data receipt from paused
announcements.

The expanded public suite has 65 passes/three failures: constrained named-action triggers still run,
and capacity trimming reuses generated log-entry IDs. Guard action roots and originating controls
before invoking the public operation. Generate collision-checked IDs from a monotonic sequence while
preserving authored IDs. The other new rendering, argument-order and reentrant resource controls
pass without additional behavior changes.

### Clipboard and Code Block document/async ownership continuation (2026-09-19)

The complete current controllers, shared clipboard helper, family suites and relevant lifecycle,
type and component contracts were reviewed after the Menu checkpoint. Ambient DOM/event/navigator
use, mutable records across adoption, cached source parts, reset timers and request ordering are
candidates requiring public negatives before runtime changes. Keep native Clipboard API and legacy
fallback access isolated to the owning window, using only per-window stubs in tests. Never access
the user's real clipboard as part of this verification.

Planned files: `src/ui/clipboard.ts`, `src/ui/code-block.ts`, `src/ui/clipboard-write.ts`, a shared
private copy controller if the validated common lifecycle warrants it,
`test/ui-copy-document.test.ts`, existing copy/resource tests, the document browser fixture/spec and
affected component/ownership/ testing/audit guides. Preserve public signatures, plain-text behavior,
explicit/implicit actions, read-time native values, cancellation, original promise
results/rejections, temporary trigger state, legacy textarea cleanup and authored descriptions. The
accepted Code Block contract routes a pending result to a replacement status after enhancement
without changing the text originally copied.

Cover foreign explicit/automatic/action paths, current source/code/status/trigger parts, inherited
constraints before and after callbacks, newer requests and out-of-order success/failure, both
adoption disposal orders, adopted pending work and remaining reset deadlines, provisional timers,
complete cleanup, preservation and ordinary removal/disposal. Publish resource ownership before
acquisition. Separate accepted copy work from mutable output parts and from requests that have not
yet reached the browser. Use revisions/identities and current captured documents to stop stale
continuations. Any shared extraction needs direct regression evidence, no graph omissions and no
increased lint allowance or fixed package ceiling. All remaining family/actual-host/semantic/manual
accessibility and actual npm run check/full delivery requirements remain open.

The first public copy suite records 59 failures/four passes across 63 cases without fixture or
unhandled errors (`ui-copy-public-negative.log`). The failures validate owning-document access,
foreign actions, stale current parts, inherited constraints, async ordering/adoption and reset
resource ownership. Add `src/ui/copy.ts` as the shared private controller; retain the two small
public API/action compositions in their original modules. Shared records capture document/window,
root kind, accepted task and reset deadline. Current output parts may change without invalidating an
accepted task. Adoption can transfer that task and route its result through the destination owner;
ordinary disposal retires UI publication while each caller still receives its original result.

Separate incoming request intent from accepted task identity, so a canceled new copy preserves the
previous accepted state/reset while superseding an older before-copy continuation. Copy transport
receives the owning window and a current predicate checked around native capability lookup and
legacy fallback steps. Acquire temporary trigger state after starting transport and before returning
the pending promise, avoiding generated disabled state being mistaken for an authored constraint.
Revision checks keep reentrant transport calls from acquiring stale button state. Reset handles and
button cleanup are provisional resources; output events use the current owner's CustomEvent.

The first shared implementation passes all 202 focused assertions, but two unhandled fixture errors
keep that run failed: the invalid-selector test left malformed connected markup for the automatic
observer. Restore its selector synchronously after asserting the facade error. Follow-up controls
then expose four initial-output regressions in the extraction (63 passes/four failures): Code Block
must retain an absent/authored initial data-state, and both controllers preserve authored initial
status text. Preserve those original semantics. TypeScript also identifies a captured optional
button in a cleanup closure; bind its narrowed value. Capture optional native copy methods as bound
capabilities so getter reentry remains guarded without unbound-method lint allowances.

Additional public controls cover generated description tokens copied into replacement triggers,
accepted success/failure settled between adoption and destination enhancement in both cleanup
orders, and an accepted native writer rejection after temporary button acquisition throws. Keep
these outcome paths observable without publishing through a retired document or abandoning a native
promise. Preserve authored description tokens and the original caller failure.

The handoff controls pass 83 of 85 assertions and expose two stale generated description failures
plus one unhandled native rejection (`ui-copy-handoff-negative.log`). The eight completion-before-
claim adoption controls already pass; they do not justify a separate adoption change. Remove an
owned old description token from a replacement trigger when the current status ID changes. If button
acquisition throws after transport starts, attach a rejection observer to that transport before
propagating the acquisition error; keep successful transport and original failure behavior.

### Menu, Context Menu and Menubar continuation (2026-09-19)

Twelve public document/acquisition/supersession failures remain across these three families. The
complete Menu and Menubar sources and all three family suites were re-read after Hover Card. Extend
public negatives before runtime edits. Preserve keyboard exploration, focusable inactive
aria/data-disabled items, native disabled exclusion, checkbox/radio selection, current labels,
Context Menu coordinates/touch long press, typeahead deadlines, private action argument contracts,
Menubar orientation/value/one tab stop and independent child ownership. Cover native acceptance, all
relevant cross-kind handoffs, sibling close cancellation/reentry, focus callbacks, dynamic
constraints/parts/groups, nested/canceled events, exact cleanup and adoption in both disposal
orders.

Planned files are `src/ui/menu.ts`, `src/ui/menubar.ts`, public floating/resource/cancellation
tests, the existing document browser fixture/spec and affected component/ownership/testing/audit
guides. Enroll Menu kinds in shared native content ownership after negative controls establish their
handoff and focus behavior. Extend point positioning only if a geometry-reentry regression proves
the need for a current predicate. Shared lifecycle resources capture documents/parts/timers before
acquisition; pending search/long-press work needs identity and absolute deadlines. Menubar ownership
must precede listener acquisition and guard continuation across child API calls. These are planned
corrections/candidates, not accepted runtime fixes. No lint allowance, public API or fixed ceiling
increase is authorized by this plan. Full original family/actual-host/semantic/delivery scope
remains.

The expanded public Menu/Context Menu controls validate stale geometry after a newer close, foreign
actions/adoption, current parts, callback-time constraints/selection and incomplete cleanup. The
first 205-case run has 139 passes/66 failures; its deliberate cleanup-failure cases also repeat
cached disposal errors during fixture teardown, so consume those fixtures explicitly in the next
run. Timer and cross-kind native handoff controls extend the negative set before implementation.

Add `src/ui/floating.ts` to the implementation manifest. Context Menu point placement must accept a
current predicate checked after geometry reads, matching anchored placement. Both Menu kinds join
shared native content ownership and revision-bound deferred completions. Remove the legacy floating
record/show wrappers after their final Menu callers migrate; keep other shared helpers used by
remaining controllers. Snapshot state includes focused owned item, context point, search and
absolute search/long-press deadlines; mutable timer handles remain local resources. Close siblings
before accepting a new panel, and stop if a sibling close is canceled or a callback supersedes the
request. Selection rechecks current item kind/group, constraints and revision before
checked-state/default continuation. Explicit Context Menu string/element targets must remain
distinguishable from implicit numeric coordinates without changing its public argument order.

The first Menu rewrite exposes an existing Menubar observer loop once adopted child menus remain
open. The live worker's sampled/inspected stack is the UI auto-enhancement observer repeatedly
processing `data-value` on the same open Menubar. Its stable `syncState` writes the same value
again. The worker then exited unexpectedly; Vitest reports an unhandled worker error and no
acceptance for the unfinished public file. A later stop attempt found those process handles already
absent. Add a synchronous public mutation-record control, then make Menubar reflected value writes
idempotent before resuming focused verification. Full Menubar resource/revision work remains next.

The corrected focused run has 391 passes/five failures. Three are unfinished Menubar ownership
paths. Two native opening handoffs between Menu and Context Menu lose the new-kind notification
because their shared controller silently restores the previous kind's open snapshot. Include the
kind in that snapshot and restore only within the same kind; a new kind accepts its own opening and
notification through shared native reconciliation.

The lint-boundary probe finds the removed Menu non-null assertion: recorded one, observed zero. Add
`quality/lint-boundaries.json` to the changed-file ledger and delete only that obsolete entry; this
reduces the debt inventory without adding an allowance. The other exact counts remain fixed.

The targeted Menu browser run passes all 183 selected cases across the three desktop engines. Its
125 startup input hashes match at terminal completion before further runtime edits. The expanded
266-case public suite has 245 passes and 21 failures, all in Menubar. Replace Menubar's ambient
realm checks and post-acquisition ownership with captured-document UI resources published before
listeners. Reacquire current direct menu/trigger parts through facades, preserve roving value and
pending search deadlines across adoption, and bind child API calls to the destination owner. Root
intents protect cleanup/setup; request revisions stop older focus, opening and close loops. Parent
close must invalidate every current child's pending opening, even when it still appears closed, and
must stop when a callback chooses a newer parent operation. Reflect accepted child state after
cancellation. Ignore canceled/composing/nested navigation and nested lifecycle events. Honor native
disabled/fieldset/inert constraints and data-disabled=false. Add the private composition wiring in
`src/ui/index.ts` to the manifest: Menubar facade acquisition must refresh independently owned child
Menus through the destination collection without opening them or resetting item focus. Child Menu
opening must also recheck inherited disabled constraints after before-open callbacks. Listener and
timer setup must retain cleanup before acquisition, including registration that disposes or throws.

The first Menubar rewrite passes all 270 public document cases. The focused run has 432 passes and
one failure in the older document-timer control: its interceptor accepts only exactly 500/550 ms,
while the retained-deadline scheduler subtracts a second clock read. Freeze that control's clock so
it measures per-document timer cleanup deterministically. The first typecheck also identifies one
Element that was not narrowed in implicit action resolution; use the realm-safe HTMLElement
predicate.

The corrected focused run exposed the same clock mismatch in a second older timer control. Include
Date in that file's existing fake-timer clock so elapsed deadlines and timer advancement agree
throughout the resource suite. The 90-file UI/runtime selection then passes all 2,388 cases. The
first Menubar browser selection passes all 90 cases with 125 unchanged inputs at completion.
Typechecking its new fixture requires three explicit querySelector element types; correct those
annotations before the full matrix. The attempted `npm run test:integration` names no existing
script and supplies no evidence; use the repository's explicit Vitest integration selection. The
ratchet reports obsolete Menubar base-to-string and non-null entries and a reduced unnecessary
condition count (three to two). Remove only those obsolete counts, reducing the inventory to 295
exact file/rule entries without an increase. Strengthen Context Menu action-mode cleanup checks to
send the native contextmenu event after action teardown.

Two additional public controls reproduce blocked horizontal exploration from focusable inactive
ARIA/data-disabled child menu items (270 passes/two failures). Keep parent/trigger/inert/native
constraints, but distinguish item inactivity from navigation eligibility. Add both inactive item
variants to the native Menubar ownership fixture. The running first full browser matrix was
intentionally interrupted after these negatives, with terminal exit 130 and all 125 input hashes
verified before source edits; its partial report is diagnostic only. Restart the full matrix after
this correction. The complete 97-file integration before these two added controls passed 2,523.

### Select, Combobox, Multi Select and Time Picker documents: next group (2026-09-19)

The ignored `ui-choice-time-document-probe.test.ts` executes eight failures without fixture or
unhandled errors. Each family rejects its own foreign-document facade target and loses its simple
native interaction after destination enhancement of an adopted root followed by source disposal.
Select fails native selection reflection, Combobox fails native query invalidation, Multi Select
fails selection reflection, and Time Picker loses its increment button behavior.

Promote the probes to `test/ui-choice-time-document.test.ts` before editing `src/ui/select.ts`,
`src/ui/combobox.ts`, `src/ui/multi-select.ts` and `src/ui/time-picker.ts`. Extend the existing
browser fixture/spec to all four families. Review native identity, explicit/context private actions,
captured document/window/form ownership, immediate destination reacquisition, current parts,
provisional acquisition, complete cleanup/reentry and callback revisions together. Include active
record sets, document/window handlers, floating positioning, typeahead/close timers and native form
reset work. Preserve native selected/default values, generated options/tags/hidden fields, query
composition/selection, active-option focus, disabled/max/required constraints and Time Picker's
native time validity/stepping. Source cleanup cannot release current destination resources; stale
notifications cannot overwrite newer state. Reuse existing shared lifecycle/DOM helpers and record
any concrete need before extending shared code. Update component/ownership/testing guides and exact
changed-file/command ledgers. Run family/resource/reset/transition tests, full UI/kernel/bridge
integration, all three browser engines and static/fast checks. Complete remaining-family review,
actual-host matrices, fixed budgets, semantic source/claim review and full delivery remain required.

The first 51 public cases reproduce 46 failures and five controls. Correct the fixture buttons to
explicit `type="button"` before repeating the negative run, so a foreign Time Picker that has not
been enhanced does not invoke jsdom's unsupported form submission. Preserve both logs. Begin with
Time Picker's record ownership and callback/reset continuations while keeping the other three
controllers' public failures open. Use native DOM identity, a captured `UIResources` record and
`listenUIReset`; preserve silent native values across disposal/adoption with a weak last-reflected
value. Stepping must probe a cloned native control instead of temporarily mutating the live one.
Guard nested presets, inherited fieldset disabling, replaced controls and constraints changed by
callbacks. No shared helper change is needed for this controller. This is implementation ordering
within the four-family Plan, not a reduction of its acceptance scope.

Select follow-up: extend the same public suite before editing `src/ui/select.ts`. Retain exact
generated nodes, listeners, active-option exploration and typeahead through unchanged enhancement.
Capture native control/form/label, trigger/content, option identity and document; replace stale
records on facade use or enhancement. Selection and open/close requests need operation revisions,
including newer no-ops, native edits, option disabling/removal and sibling-close callbacks. Own
popup cleanup and timers provisionally and reconcile native show/hide reentry without closing a
newer popup. Preserve silent native values and active exploration across destination acquisition,
and keep source document handlers from acting on the adopted root. Include `src/ui/floating.ts` for
one concrete shared need: `positionFloating` currently writes geometry after a measurement callback
can retire or supersede the Select. Add an optional continuation guard for Select's captured record;
existing callers keep their current contract until separately reviewed. Add direct negative geometry
and native-popup regressions. Do not add lint allowances or change public signatures.

The expanded 95-case suite initially fails 54 and passes 41. Correct the fault-injection fixture to
restore its mock in `finally`, preventing an unused form-registration fault from reaching a later
MutationObserver callback. The first Select correction passes 164 existing family/resource cases;
the remaining cleanup assertion counted unrelated fake-clock work, so bind it to Select's captured
500ms typeahead and 0ms reset handles. The corrected suite has eight open failures in Combobox and
Multi Select. The first 18 Select browser cases all fail only retained native popover visibility
after preserved remove/reinsert. Restore the retained runtime popup on unchanged enhancement when
the native popover is closed, without resetting exploration or emitting another open notification.
Also respect canceled native `beforetoggle` opening and choose the first enabled option when the
native select has no selected value. Add direct regressions before these follow-up changes.

Two final negative cases show a facade can resume after replacement cleanup disposes its owner:
`open` emits a stale before-open, and `toggle` attempts fresh acquisition. Guard the returned record
before either continuation. Preserve these failures in
`ui-select-cleanup-continuation-negative.log`.

Combobox follow-up: extend `test/ui-choice-time-document.test.ts` before editing
`src/ui/combobox.ts`. Capture the document, query/hidden controls and their forms, content/options
and inline mode. Preserve original query/value defaults by native control identity across record
replacement and source disposal; hidden input value writes must not become a new reset baseline.
Retain draft text, selection, composition and active exploration through unchanged enhancement and
adoption. Replace broad committing suppression with exact synthetic-event identity and operation
revisions so newer native/query/select/clear work supersedes older notifications. Check current
option value/label/visibility/disabled state and native control constraints after before-select. Own
listeners/reset timers before acquisition, sweep failing cleanup and guard facade continuations
after cleanup disposal. Capture the outgoing inline/native popup mode, reconcile native show/hide
reentry and cancellation, restore preserved native popovers, and scope outside-click/focus/viewport
handlers to the captured document. Use the existing optional `positionFloating` continuation guard
for the same demonstrated measurement boundary; no additional shared-helper change is planned.
Preserve manual filtering, loading/min-length behavior, generated hidden identity and root-value
patches. Add browser proof for these paths; Multi Select and the full audit remain open.

The first Combobox negative has 65 failures and 96 passes. Correct the reset fixture to use manual
filtering so its next selection is visible, and use a matching query for callback selection. The
corrected negative has 64 failures and 97 passes. Five follow-up cases reproduce three additional
failures: ArrowUp resumes after an open callback moves exploration, and model writes leave stale
committed values when a query control is readonly or inside a disabled fieldset. Bind ArrowUp's
continuation to its opening revision and allow native/model query reflection while preventing UI
commits on unavailable controls. Composition survives both adoption disposal orders as a passing
control. The lint ratchet also rejects TypeScript's stale narrowing of option visibility across
before-select. Read current visibility/disabled state through a predicate, retaining the existing
one-condition allowance without increasing it.

Multi Select follow-up: extend `test/ui-choice-time-document.test.ts` before editing
`src/ui/multi-select.ts`. Capture native control/form/label, document/window, trigger/content/tags
and generated option identity. Preserve native selection/defaults, stable generated nodes,
exploration and typeahead through unchanged enhancement and destination acquisition. Use a weak
last-reflected JSON value to distinguish server patches from silent native selection. Own listeners,
reset work and typeahead provisionally, sweep cleanup failures and protect ownership created during
cleanup. Replace broad committing suppression with exact synthetic-event identity and operation
revisions, including newer no-ops. Recheck native selection, option structure, disabled constraints
and current maximum after before-change and each notification. Disabled preselected options stay
selected during UI/API selection changes; native writes and root JSON patches remain authoritative.
Their tags cannot remove locked selections, and select-all must compare actual enabled membership
while reserving capacity for locked values. Clearing an ordinary required selection remains allowed
and leaves validity to the native select.

Scope delegated options/removal to the current controller, preserve nested native input and
composition behavior, and refresh generated labels without overriding authored names. Include
empty/renamed option groups in option structure. Reconcile popup completion, sibling cancellation,
preserved native visibility and current focus/scroll continuations. Use the existing optional
`positionFloating` guard for this controller's measurement boundary; no further helper change is
planned. Extend the same six-mode browser fixture/spec, update affected guides/evidence and run
focused/full integration, all engines and static/fast checks. Keep the complete family/host,
semantic, fixed-budget and delivery scope open.

The expanded 235-case public suite reproduces 65 failures and 170 passes. Supply native controls
inside the nested-controller fixtures to remove four unrelated asynchronous enhancement errors; the
corrected negative has the same failure/pass counts and no unhandled errors. The first
implementation passes 367/fails seven in six focused files. Two existing cases require a replaced
native control or content panel to close the popup; preserve that contract while retaining open
state for adoption of the same parts. Five failures concern jsdom including disabled selected
options in FormData. Verify that boundary in all three real engines and keep its assertions in the
browser suite, while unit cases continue proving selection retention and disabled removal controls.
The immutable ratchet reports removal of one non-null assertion and two unnecessary conditions.
Include `quality/lint-boundaries.json` to remove the former allowance and reduce the latter from
three to one, without adding replacement exceptions.

The corrected first focused run passes all 374 cases. Five further public cases prove two retained
typeahead/adoption controls and reproduce three continuation failures: a timer acquisition callback
changes exploration before the old typeahead resumes, and native input callbacks disable the control
or reduce its maximum before later notifications. Capture the typeahead operation revision and
recheck live commit constraints between native notifications. These are continuations within the
existing controller Plan and require no shared code changes.

### Collapsible, Accordion, Editable and Stepper documents: next group (2026-09-19)

The ignored `ui-disclosure-step-document-probe.test.ts` executes six failures and four passing
controls. All four foreign facades reject their own document's targets. Collapsible and Accordion
also fail native summary cancellation immediately after destination enhancement and source disposal,
before an asynchronous enhancement barrier can repair listeners. Simple adopted interactions pass
for Editable and Stepper; disclosure state reflection passes after its native toggle turn. Preserve
these controls without treating them as proof of immediate resource ownership.

Promote the cases to `test/ui-disclosure-step-document.test.ts` before editing
`src/ui/disclosure.ts`, `src/ui/editable.ts` and `src/ui/stepper.ts`. Extend the existing browser
fixture/spec to all four families. Review native identity, private actions, current parts,
document/window capture, immediate destination reacquisition, provisional setup/complete cleanup,
cleanup reentry and callback revisions together. Preserve native details/summary default actions,
asynchronous toggle events, Accordion exclusion/required-open behavior and keyboard focus. Editable
must retain committed values, draft selection, composition, native constraints and cancel/commit
semantics. Stepper must retain ordered steps, completion state, native validation, cancellation and
current panels/status. Source cleanup cannot release destination resources; stale callbacks cannot
commit after newer work. Record any concrete helper need before extending shared code. Update public
and brain guides, changed-file/command ledgers and source bindings; run focused and full UI/kernel/
bridge integration, all three browser engines and static/fast checks. All remaining families, fixed
budgets, full host matrices, semantic source/claim review and actual delivery remain in scope.

The first 72 public cases reproduce 59 failures. Expanded native-link and late click-cancellation
cases also require Disclosure to preserve native summary default actions: prepare cancelable sibling
permissions during the click, then let native named-details exclusion run only if the click remains
accepted. Keep pending native toggle notifications across unchanged enhancement. Use an internal
Accordion operation revision so callbacks on one item can supersede another item's pending request.
Editable must retain drafts through source disposal and ignore composing Enter; native validation,
change and focus callbacks must stop stale continuation. Stepper must preserve rendered completion
on reacquisition and use proposed transition detail without exposing uncommitted internal state.
These changes fit the three planned controllers and existing resource helpers. The immutable lint
ratchet finds two removed Stepper non-null assertions. Include `quality/lint-boundaries.json` to
reduce that existing allowance from eight to six; do not add assertions or increase allowances to
make counts match.

### Tabs, Toolbar, Pagination and Sidebar documents: next group (2026-09-19)

The ignored `ui-navigation-document-probe.test.ts` executes five failures and three passing controls
without fixture or unhandled errors. All four foreign facades reject their own installed document's
root. Tabs also loses native activation after adoption, destination enhancement and source disposal.
The simple adopted Toolbar, Pagination and Sidebar interactions pass; preserve them as controls,
without treating them as a complete resource/document audit.

Promote the probes to `test/ui-navigation-document.test.ts` before editing `src/ui/tabs.ts`,
`src/ui/toolbar.ts`, `src/ui/pagination.ts` and `src/ui/sidebar.ts`. Extend the existing browser
fixture/spec for independent frames and adoption across all four families. Review native identity,
private actions, captured ownership, current parts, provisional setup/complete cleanup and callback
revisions together. Preserve Tabs activation, panel relationships and cancellation; Toolbar's native
text inputs and roving focus; Pagination's real links, modifier clicks and manual navigation; and
Sidebar's desktop/mobile retained state, media listeners, storage, document shortcut and focus
return. Reacquire destination resources before facade use and prevent source cleanup from releasing
new ownership. Shared helpers may be extended only for a documented need. Update affected guides and
ledgers, run family/resource/transition and complete UI/kernel/bridge integration, all three browser
engines and static/fast checks. The complete 50-family audit, fixed budgets, host matrix, semantic
source/claim review and full delivery remain required.

The first public 62-case suite reproduces 53 failures and nine passing controls after correcting
expected repeated-disposal assertions in the test harness
(`ui-navigation-document-negative-final.log`). The first implementation passes all 217 focused cases
across seven files. Eight further cases check cleanup reentry, manual tab focus, retained desktop
preference and destination media/storage/shortcut ownership. They reproduce one remaining
collapse-mode transition failure (`ui-navigation-followup-negative.log`): changing Sidebar from
non-collapsible back to collapsible in a mobile viewport leaves desktop mode. Recalculate that
transition with the captured media query. Keep a weak Sidebar state snapshot (only
expanded/mobile/desktop preference and last reflected value) so source disposal before destination
acquisition does not erase the desktop preference. No shared helper changes are needed.

### Input OTP, Tags Input and toggle documents: next group (2026-09-19)

The ignored `ui-token-toggle-document-probe.test.ts` executes six failures and two passing controls
without fixture or unhandled errors. Input OTP, Tags Input, Toggle and Toggle Group each reject a
foreign installation's own facade target. Toggle and Toggle Group also lose native interaction after
adoption, destination enhancement and source disposal. The simple adopted native Input OTP and Tags
Input interactions pass; preserve those controls without claiming their full ownership audit is
done.

Promote the probe to `test/ui-token-toggle-document.test.ts` before editing `src/ui/input-otp.ts`,
`src/ui/tags-input.ts` and `src/ui/toggle.ts`. Extend the existing document-ownership browser
fixture and spec for all four families. Review native identity, context-based private actions,
generated slots/tags/hidden controls, owning-document events/focus and destination reacquisition.
Capture resources before native setup, preserve newer ownership during teardown, sweep cleanup
failures and stop stale callback continuations. Retain values, partial OTP input, selection/focus,
composition, roving keys, toggle requirements and form fields through unchanged enhancement and
supported adoption. Review actual reset contracts rather than infer them from current tests. Update
affected guides and the changed-file ledger; run existing family/resource/form/transition tests,
complete UI/kernel/bridge integration, all three browser engines and static/fast checks. The first
60 public cases produce 50 failures. They also show Input OTP leaving slots/value stale after native
form reset. Use the existing shared owned-reset helper for Input OTP, with captured form ownership,
late cancellation, stable pending work and stale-timer invalidation. Tags Input and toggle form
behavior must retain native defaults and generated field semantics; do not invent reset operations
for their logical state. Shared helpers may be extended only with a recorded concrete need. All
remaining families, fixed budgets, source/claim review, host conformance and complete delivery
remain in scope.

### Native field documents and adoption: next group (2026-09-19)

The ignored `ui-native-field-document-probe.test.ts` now executes eight failures without fixture or
unhandled errors. Number Field, Password Field, Search Field and Rating each reject their own
foreign-document facade target. Each also loses native behavior after destination enhancement of an
adopted root followed by source-kernel disposal. The common guard is already corrected; these
controllers still use ambient constructors and reuse a record without checking its document owner.

Promote the cases into `test/ui-native-field-document.test.ts` before changing
`src/ui/number-field.ts`, `src/ui/password-field.ts`, `src/ui/search-field.ts` and
`src/ui/rating.ts`. Extend `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` for the same four families in independent frames and adoption.
Use shared DOM identity helpers and capture document/window ownership in records. Retire old records
before destination reuse, preserve native values/visibility/selection and unchanged live bindings,
and keep current native events, reset timers, forms and focus in the owning document. Review private
actions, provisional setup, complete cleanup, current parts and callback continuation together;
changing only the root resolver would leave the adoption failure. Include `src/ui/lifecycle.ts` for
a shared owned form-reset listener/timer used by Number Field, Search Field and Rating. Native
resets must reflect current controls, honor late cancellation and discard stale queued work after
replacement, adoption or newer operations. Source disposal must not remove new destination
listeners. Preserve ordinary native forms, constraints, keyboard behavior and cancellation. Update
guides and the changed-file ledger; run the existing resource/native-reset/ family suites, complete
UI/kernel/bridge integration, all three browser engines and static/fast checks. The full remaining
family/host/budget/source/claim/delivery audit stays open.

### Same-origin documents and adopted UI roots (2026-09-19)

The post-Carousel/Scroller Chromium probe still rejects a foreign Countdown facade target, an
explicit foreign-element enhancement root and an adopted Countdown received by the destination
facade. The adopted node has the correct destination `ownerDocument` but retains its origin
prototype. The source-bound diagnostic is `ui-realm-carousel-scroller-browser-result.json` under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`. A lexical census finds 297 ambient DOM
constructor checks in 45 UI files; this is reconnaissance, not completed semantic review. Checks
against `ownerDocument.defaultView` constructors also need adoption review, including `src/dom.ts`.

Plan shared internal DOM identity helpers before changing affected callers. A separate native-only
probe verifies Node/Element property getters across Chromium 151.0.7922.34, Firefox 153.0 and WebKit
26.5: local, foreign and adopted buttons retain valid DOM identity, while a lookalike plain object
is rejected. The same adopted node fails the destination constructor check in all three engines. Use
this as feasibility evidence; add public negative regressions before implementation. Preserve
rejection of wrong-document targets, unavailable roots, non-HTML nodes where HTML is required,
disposed facades and invalid objects.

Review `src/dom.ts`, `src/ui/lifecycle.ts`, `src/ui/index.ts` and all affected controller modules
for root/part/target checks, context-based private actions, explicit and automatic enhancement,
document-owned events/focus/DOM creation and old/new ownership on adoption. Include current records,
clocks, observers, reset work and generated elements; fixing only Countdown's getter is
insufficient. Keep the entire 50-family contract in scope, with failing public tests and a recorded
ledger for each implemented group. Use independent same-origin frame windows without rewriting
protected browser globals. A testing realm lease is a separate process utility and cannot establish
browser support. Add direct browser evidence for both ordinary frame installation and destination
reacquisition of adopted roots, alongside complete unit/UI/host conformance. Update affected guides
and source/claim bindings, retain fixed budgets and run static/fast checks before current full
delivery. The planned files include new DOM/UI realm regressions and existing browser conformance
fixtures as appropriate; record their concrete names before each implementation group. AC-34–AC-37
remain open.

First implementation group: `src/dom.ts`, `src/kernel.ts`, `src/ui/lifecycle.ts`, `src/ui/index.ts`,
`src/ui/countdown.ts`, `src/ui/carousel.ts` and `src/ui/message-scroller.ts`. Add
`test/dom-realm.test.ts` and `test/ui-document-ownership.test.ts`, with
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` for independent
browser-frame proof shared across the three desktop engines. Cover direct/selector facade calls,
explicit/document/automatic enhancement, native callbacks and private actions, old-owner rejection,
destination reacquisition, adopted render/preservation/removal boundaries and document-owned events.
Dialog must reacquire its own listeners and modal lifetime when adopted, and keep focus within its
owning document. Shared input/select predicates must recognize adopted native controls while
rejecting other namespaces and lookalike objects. Keep DOM access lazy for modular imports. Review
actual tests before extending additional controller groups; this group does not close the remaining
families or the full adoption contract. Update component/ownership/testing guides and audit ledgers.

The first browser matrix additionally reproduces loss of native Dialog modality on a preserved
remove/reinsert and a WebKit Carousel enhancement loop from unchanged disabled writes. Restore
modality only for the retained runtime modal record, tolerate environments without the native modal
selector and ignore old queued close events after reopening. Make button disabled writes idempotent.
Include `etc/jquery-star-ui.api.md` for canonical declaration/API regeneration: the first fast run
shows only the existing forgotten-export warning's source line moving after the Dialog edits. Keep
all public signatures unchanged. Reference the browser fixture functions through type imports in its
spec so static unused-code analysis sees the dynamically loaded consumers without a waiver. Further
public negatives require Carousel/Scroller facades to reacquire an adopted root before the
enhancement barrier, and require Carousel focus pauses to reflect the destination while retaining
explicit user pause. These are included in the named first-group sources and tests.

### Carousel and Message Scroller cross-cutting follow-up (2026-09-19)

Five executed ignored probes now fail for these two enrolled families: each retains a timeout
returned after disposal and leaves earlier listeners installed when a later registration throws;
Message Scroller also leaves an observer connected when `observe()` throws after registration.
Promote the cases from `ui-controller-acquisition-probe.test.ts` into
`test/ui-carousel-scroller-resource-lifecycle.test.ts` before editing `src/ui/carousel.ts` and
`src/ui/message-scroller.ts`. Own records before native setup, capture exact cleanup before each
acquisition, invalidate late callbacks and sweep all cleanup failures. Preserve newer reentrant
ownership during teardown. Review unchanged enhancement, current parts, retained pause/follow/unread
state, Carousel cancellation/focus/rotation events and Message Scroller scrolling/focus/events. Keep
native keyboard/pointer behavior, reduced-motion handling and message identity semantics. Update
affected guides and evidence, run existing family/resource/transition suites, the complete
UI/kernel/bridge integration and required static/fast checks. The full audit scope remains
unchanged.

Include `src/ui/lifecycle.ts` for shared internal resource-record state, guarded native binding,
complete cleanup and setup-error preservation helpers used by these two controllers. Keep the
existing ownership and public facade APIs unchanged. Controller-specific timers, retained state,
observer ownership and transitions stay in their controller modules. Public tests must exercise
behavior through installed UI facades, without importing the helpers. This shared implementation
also avoids copying another pair of native-listener lifecycle implementations.

A current-source Chromium probe additionally shows a separate document-contract gap: an
independently installed foreign-document Toast facade succeeds, but Countdown's facade rejects its
own foreign element when called from the parent realm. [COMPATIBILITY.md](../COMPATIBILITY.md)
explicitly includes same-origin frame documents. Review the common guard, root resolvers, private
actions and adopted roots together before choosing a correction; do not exempt this failure as a
Vitest artifact. The testing realm lease itself cannot redefine Chromium's protected `window`
property. That limitation is separate from ordinary independent-document API calls and does not
resolve them.

### Cross-cutting audit after controller enrollment (2026-09-19)

Continue the full AC-34–AC-37 audit after all 50 families have scoped enrollment. An isolated
ignored probe now proves Countdown leaves an interval acquired during reentrant disposal: cleanup
runs before `setInterval` returns, so its late handle escapes immediate cancellation. Promote that
probe into public resource lifecycle tests before changing `src/ui/countdown.ts`. Review
shared-clock setup/teardown, captured ownership, retained deadlines, late ticks and native scheduler
failures; make acquisition transactional without changing the one-clock-per-document behavior.
Preserve the full remaining review of private actions, unavailable descendants, adoption,
provisional resources, callback continuation, fixed budgets and actual-host conformance across every
family. A green fast run is not evidence that this separately reproduced failure is fixed.

Use `test/ui-countdown-resource-lifecycle.test.ts` for public regression coverage. In addition to
the late handle, cover scheduler reentry/failure, clock cancellation reentry/failure, superseded
ticks, completion callbacks that dispose or start newer work, and owning-document
notification/retirement. Separate weakly retained Countdown state from live ownership, version
operations and shared clock leases, and detach a clock lease before native cancellation so callbacks
can safely acquire its replacement. Preserve authored duration, deadlines, pause/resume, current
parts and one shared clock per document. Update component/ownership/testing guidance and audit
ledgers; run existing Countdown, resource, UI/kernel/bridge tests, typed lint, immutable ratchet and
fast verification. Any lint inventory edits may only remove obsolete allowances. Adoption acceptance
across the whole UI and independent-browser realm proof remain part of the full audit.

The same ignored probe verifies that Vitest's local `document.defaultView` is the mutable global
wrapper: a foreign realm lease replaces the captured window's Element property while the original
local constructor still recognizes the local node. This establishes the test-environment mechanism
behind the overlapping Toast probe. Genuine independent-window behavior and the supported public
realm contract still need verification before any production correction or scope disposition.

### Calendar and picker resource enrollment (2026-09-19)

Enroll all four families in `src/ui/calendar.ts`: Calendar, Range Calendar, Date Picker and Date
Range Picker. Scope logical records and exact native listeners, capture cleanup before registration
and sweep all cleanup failures. Retired delegated callbacks must not lazily acquire a replacement.
Preserve native values, selected ranges, month and roving focus across reacquisition; unchanged live
enhancement retains grid nodes/signatures and picker bindings. Generated calendar DOM and active
focus checks belong to the owning document. Filter all four root enumerators during render removal.

Use record identity/lifetime and transition revisions to stop selection, range clearing, month
navigation, native input/change, component notifications, popover transitions and focus after
disposal, part replacement or newer work. Version queued picker focus, retaining intended focus
through unchanged enhancement but invalidating it on close, selection, retirement or replacement.
Own picker listeners separately from child Calendar and Popover scopes. Keep native form values,
cancelable selection, range constraints, authored markup, labels and keyboard behavior unchanged.
Review actual native reset behavior with probes before adding any reset synchronization; the current
picker source has no reset listener and existing tests do not prove that contract.

Add public failing regressions in `test/ui-calendar-resource-lifecycle.test.ts` before source edits.
Cover all removal boundaries and preservation for all four families, reacquisition, native
callbacks, replacement/reentry, pending focus, interrupted setup and owning-document isolation.
Shared internal ownership/binding helpers may serve the four families in this module without adding
a public API. Update component, ownership and testing guidance, this ledger and the program audit
checkpoint. Run existing calendar/range/current-part tests, UI/kernel/host integration, typed lint,
immutable ratchet and fast verification. Enrollment does not close cross-cutting ownership, fixed
budgets, actual-host conformance, complete delivery or AC-34 through AC-37.

The reset/realm probe establishes that an ordinary form reset restores native values but leaves the
Calendar selection stale. Add scoped reset listeners for each distinct associated form and capture
their owning window's timers. Apply current native values after uncanceled reset, without emitting
selection events; discard queued work after retirement, control/form replacement or newer selection.
Unchanged enhancement retains pending reset work. Calendar native callbacks also need owning-window
constructors after a temporary realm lease ends. Constraint patches during before-change must
invalidate the earlier transition, using the last rendered signature as evidence of effective
change. The first probe has seven failures and 68 controls; one range replacement fixture must use
an ordered range (its replacement start was after its default end). Keep the original log as failure
history.

Further probes expose empty resets being reseeded from stale Calendar attributes and reversed native
endpoints disagreeing with the normalized Calendar. Seed from Calendar attributes only on the first
successful picker enhancement; thereafter native controls, including empty values, are
authoritative. Keep the initial-seeding flag weakly keyed across detach/reacquire. Normalize both
native endpoints with the Calendar. Include `quality/lint-boundaries.json` only to reduce obsolete
exact allowances after removing duplicated code; do not increase any allowance or budget.

### Toast resource enrollment (2026-09-19)

Enroll `src/ui/toast.ts` in scoped ownership. Capture root/close/action listeners, dismissal timers,
swipe capture and announcement nodes/timers; release them on render/native removal and disposal. Use
the owning window for scheduling and elapsed time. Unchanged enhancement preserves remaining
duration, paused interaction and current announcements. Replaced controls rebind exactly once;
cleanup freezes the remaining display budget for later reacquisition, separately from live
resources. An intentionally dismissed toast stays closed if its same node is re-enhanced.

Keep the separate accessibility announcement through ordinary dismissal for its existing ten-second
lifetime, with ownership in the viewport. Scope cleanup of a still-live toast also releases its
announcement; viewport/kernel cleanup always releases it. Provisional setup must capture cleanup
before native acquisition, stop after reentrant disposal and preserve setup/cleanup errors. Do not
duplicate bindings or resurrect a record when cleanup itself causes enhancement.

Guard before-dismiss, root removal, focus recovery and clear loops against disposal, replacement or
a newer dismissal. Normal dismissal still emits its event after removal; disposal during focus must
stop that notification. Capture the installation document for show/target resolution, reject foreign
or unavailable explicit viewports before mutation, filter outgoing enhancement/F8 targets and
restrict focus recovery to available toasts in that document. Preserve native action behavior,
authored ARIA, action alternative text, cancellation and hover/focus/window/visibility pauses. Add
public regressions in `test/ui-toast-resource-lifecycle.test.ts` before source edits, then run
existing Toast/popup/resource tests, typed lint, the immutable ratchet and fast gate. Update
component/ownership/testing guidance and both audit tickets/checkpoints. Calendar/picker ownership,
cross-cutting review, fixed bundle limits, host conformance and AC-34 through AC-37 remain required.

The complete fast run also requires updating `test/runtime.test.ts`'s persistent resource inventory:
Toast now owns an installation lifetime service and relies on kernel removal rather than installing
another document observer. Keep the exact service list and observer assertion, adjusted to the new
owners. Include this file in the Toast changed-file manifest; the first full unit failure records
the stale expected inventory before that correction.

### Questionnaire resource enrollment (2026-09-19)

Enroll `src/ui/questionnaire.ts` in scoped ownership. Capture its root/button/form listeners and
reset timers before acquisition, remove every binding on retirement, and cancel timers in their
scheduling window. Reuse unchanged items/form/buttons so enhancement preserves pending native
resets; replace bindings when those identities change. Retain default navigation and submitted state
separately from live resources across detach/reacquire. Keep native answer serialization,
validation, disabled questions, cancellation and form reassociation. Use the owning document for
generated skip controls and its fieldset constructor without expanding the public realm lease.

Version transitions so disposal, replacement or a newer transition from before-change, before-skip,
before-submit, native answer events, validation, focus or scrolling stops the older continuation.
Canceled older transitions must not roll back newer state. Reset committing state in a finally
block, and stop authored submit propagation when a questionnaire callback retires the controller.
Filter outgoing roots during connected render removal. Add public failing regressions in
`test/ui-questionnaire-resource-lifecycle.test.ts` before source edits for removal, preservation,
reacquisition, reset cancellation, callback replacement/reentry, interrupted setup and two
documents. Update the component/ownership/testing guides, this ledger and the umbrella audit
checkpoint. Run existing questionnaire/form/transition tests, focused type/lint checks and the fast
gate. Full host conformance, fixed budgets, remaining families and AC-34 through AC-37 retain their
original scope.

### Chart and Data Table resource enrollment (2026-09-19)

Continue the complete lifetime correction with `src/ui/chart.ts` and `src/ui/data-table.ts`. Chart
must register its logical record with the scope, filter outgoing enhancement and stop a render after
disposal or a newer render from before-render. Preserve canceled-render retry and current-part
signatures; create SVG/legend nodes in the owning document. Data Table must own exact
header/filter/pagination/root-selection bindings and stop a sort after disposal, enhancement or a
newer sort from before-sort, including cancellation rollback. Preserve native table semantics,
manual processing, stable row order and selection across page patches. Retain only weakly keyed
state needed for detach/reinsert enhancement (selected identities, initial-seeding status, weak row
order and filter); retired listener records must not remain live. Reacquisition binds once and does
not seed later checked replacement rows. Add failing public regressions in
`test/ui-data-resource-lifecycle.test.ts` before implementation, including all removal boundaries,
preservation, repeated enhancement, replacement/reentry and two-document ownership. Update
component, ownership and testing guidance and the changed-file ledger. Existing Chart/Data Table,
identity/transition, kernel/host and full quality gates remain required. This extension does not
narrow remaining controller enrollment, fixed budgets or AC-34 through AC-37.

The public setup probe also requires Data Table to stop binding after disposal inside native
listener registration and release already installed listeners when registration throws. Capture
removal before calling native registration, stop subsequent acquisition when the record retires, and
release the failed scoped record while preserving setup and cleanup errors.

Two-document probes also require Data Table's native table check to use the owning document's
constructor. The public realm lease does not replace every specialized DOM constructor; fixtures
must use their supplied window's table, cell and SVG constructors. Keep that testing API unchanged.

### Tree and Transfer List resource enrollment (2026-09-17)

Continue the complete UI lifetime scope with `src/ui/tree.ts` and `src/ui/transfer-list.ts`. Capture
and own their item, row, button and native select listeners. Tree also owns its typeahead timer in
the scheduling window. Preserve unchanged bindings/search state and replace bindings when captured
parts change. Filter outgoing roots during render removal. Keep selected values, native form
serialization, generated IDs, expansion and active-item behavior across valid enhancement. Stop
event chains after disposal or record replacement, including Transfer List before-change, component
change and native input, plus Tree selection, expansion, sibling/ancestor loops and focus. Generate
Transfer List hidden inputs in the owning document. Add failing public probes in
`test/ui-collection-resource-lifecycle.test.ts` for cleanup, preservation, reacquisition, callback
disposal and two-document timers before source edits. Update component, ownership and testing
guidance and the changed-file ledger. Existing value/identity/transition suites, typed lint, the
immutable lint ratchet and fast gate remain required; all other families and AC-34 through AC-37
retain their original scope.

Feed follows in this collection suite. Add `src/ui/feed.ts` to the manifest. Own the captured
More/content listeners and IntersectionObserver, invalidate superseded observer callbacks even while
the same controller remains live, and use the owning window's observer constructor. Stop
load/complete/reset, pending focus, scrolling and observer replacement after callback disposal.
Preserve unchanged observer ownership and normal authored load actions. Filter outgoing roots and
resolve boundary focus within the owning document. Verify physical disconnection, late delivery,
part replacement, connected moves/preservation, two documents and disposal during native observer
setup/teardown. Keep registry request orchestration unchanged.

### Native picker and choice resource enrollment (2026-09-17)

Continue the complete lifetime scope with Color Picker and Time Picker, then the remaining native
choice controllers. Both pickers currently retain unscoped listeners and global reset timeouts.
Enroll their exact bindings with `ownUIRecord`, filter outgoing enhancement and stop
component/native event continuations after callback disposal. Add a shared form-reset binding in
`src/ui/lifecycle.ts` that captures the native control, form and scheduling window, cancels all
pending timers on cleanup, and ignores canceled resets or work for detached/reassociated controls.
Keep pending current resets through unchanged enhancement and acquire one current binding after
form/part replacement. Preserve native values, validity, constraints and cancelable changes. Planned
files are the two controllers, the shared helper, `test/ui-choice-resource-lifecycle.test.ts`,
existing form/constraint suites and component/ownership/testing guidance. Add failing public
regressions before source edits, including render/native/disposal/preservation, repeated
enhancement, canceled resets, stale queued callbacks and two-document teardown. Fixed budgets and
full-program acceptance remain unchanged.

Multi Select follows in the same suite. Add `src/ui/multi-select.ts`: own its floating record,
typeahead/reset timers and native/form/label bindings, preserve pending current resets through
unchanged enhancement, and restrict sibling closing to the owning document. Cleanup retains the
documented selected/empty root state while hiding the panel. Stop work after before-change, native
input/change, open/close, focus, scroll and native popover callbacks retire the controller. Use the
owning document for generated options/tags, and verify teardown/reacquisition after part
replacement.

Select and Combobox complete this choice cohort. Their reset binding must survive routine option
listener rewiring and retire only with its captured control/form or the controller scope. Own panel,
label, option and native listeners; Select additionally owns typeahead. Preserve Combobox inline
mode and default query/value semantics. Stop native value/query notifications, selection/clear
events, sibling transitions, keyboard continuations and focus after disposal. Add both modules to
the manifest and extend the same public regression suite before implementation.

### Plan extension: complete UI resource lifetime (2026-09-17)

Full delivery `2026-09-17T15-48-23-507Z-72866` passes all thirteen gates and actual Test validation,
but does not exercise every public UI lifetime promise. Source-bound Countdown, Carousel and Message
Scroller probes prove retained timers/observers/effects after render removal and connected kernel
disposal. `quality-refresh-2026-09-17/ui-retained-facade-before.json` additionally disposes an empty
installation, creates fresh roots and shows the retained facade acquiring new resources. Return to
Plan before the generic correction. Preserve all earlier current-part corrections and criteria;
passing their tests does not close this newly demonstrated gap.

Design and implementation sequence:

1. Extend generic owned resources with an optional Element scope. Scope belongs to the kernel's
   document. Render removal releases scoped resources synchronously, excluding exact preserved
   subtrees; commit/failure also releases missing promised preserved roots. Record removal
   boundaries per active transaction so cleanup callbacks and deferred automatic enhancement cannot
   recreate resources there. Expose a capability to check whether a root can currently acquire
   resources. Release operation boundaries on commit, failure and disposal. Keep aggregation,
   idempotence and public resource summaries; summaries must not expose DOM references. Forward
   scoped ownership through staged plugin installation and rollback without giving UI a Kernel
   object.
2. Add a shared UI ownership helper using document capabilities. Activate it transactionally and use
   the live official-service ownership capability for controllers acquired after installation. Guard
   retained facade methods and actions after disposal, including after a replacement kernel claims
   the same document. Resolve selectors within the owning document and reject foreign roots.
   Automatic enhancement filters unavailable roots. Native removal releases disconnected roots at
   observer delivery; a connected same-document move keeps its controller. Keep helpers inert at
   import and release failed-install resources.
3. Enroll controller cleanup at its actual acquisition point, including direct facade calls, and
   remove ownership records before invoking cleanup. Clear timers, disconnect observers, detach
   captured listeners/forms, cancel pointer sessions and invalidate late async/reset callbacks.
   Preserve controller state needed for documented detach/reinsert behavior, especially Countdown's
   absolute deadline. Keep Countdown scheduling isolated by document. Re-enhancement must acquire
   exactly one current resource set, while declared preserved roots retain their live state.
4. Implement and measure the kernel/helper and the three reproduced timer/observer failures first,
   then enroll every remaining controller family. This sequence does not narrow AC-34 through AC-37:
   ownership and conformance remain unfinished until listener, pointer, floating, form and async
   families are also verified. Common owner 0016 and actual-host owners 0036/0037 depend on the
   complete correction.

Planned files: `src/kernel.ts`, `src/plugin.ts`, a shared `src/ui/lifecycle.ts`, controller modules
under `src/ui/` and `src/ui/index.ts`; kernel/plugin/public UI lifecycle tests and existing
component regressions; derived API reports; affected ownership/component/architecture/testing
guidance and this ticket. Update census or lint inventories only for real new files or reduced
existing debt. Measure current installed core/CSP/stores/root graphs during implementation: core
gzip has 228 bytes and CSP Brotli 61 bytes of headroom. Preserve immutable ceilings, graph
exclusions and coverage floors. Shared enumeration/validation cleanup may offset ownership code, but
no exception or controller omission may substitute for the required behavior.

Verification: retain failing public controls before edits. Test before-remove timing, repeated and
nested operations, explicit and missing preservation, native moves/removal, connected/detached
kernel disposal, two documents, cleanup reentry/errors, stale facades after reinstall, async
settlement and state-preserving re-enhancement. Exercise actual listener/timer/observer effects, not
only reported resource counts. Run focused regressions and package measurements during Code, then
fast, full delivery and actual phase validators. No registry orchestration, Datastar server
encoding, root jQuery/signal semantics or independent mutation tooling changes are planned.

### Native removal ordering clarification (2026-09-17)

The Form cohort exposes an ordering edge in the complete lifetime Plan: an invalid/reset
notification queued before native observer cleanup must stop when that controller retires, while
explicit detached acquisition after a previous removal must remain usable. Test detached validation
again after the cleanup boundary; its native validity and synchronous field rendering remain intact
before that boundary. Add a kernel regression for a new resource acquired on a just-removed root
before observer delivery. Drain earlier removal records from the owned observer before adding a new
scoped resource, then recheck scope/kernel availability because cleanup can dispose or reenter.
Retain preservation barriers, cleanup aggregation and pure availability checks. Planned files are
`src/kernel.ts`, the scoped-resource regression suite and the Form association/resource suites.

### Floating resource enrollment (2026-09-17)

Continue the full lifetime Plan with Tooltip, Hover Card and Popover. Their weak records currently
retain local listeners, open panels and, for the first two, delayed callbacks after scope cleanup.
Enroll cleanup at record acquisition, detach captured listeners, cancel timers using the window that
scheduled them, remove active records and close runtime-open panels without lifecycle events or
focus restoration. Preserve authored Tooltip description tokens. A preserved root keeps its pending
callbacks and open state; reacquisition binds one listener set. Stop open/close work after callback
disposal, including native popover calls and focus. Use the owning window for shared floating
geometry. Cover these effects with public regressions before changing the controllers. Planned files
are the three controllers, `src/ui/floating.ts`, a floating resource regression suite, existing
popup/label/transition tests and the component/ownership/testing guidance. Consolidate common
cleanup only where the existing controller contracts agree. Other floating families remain within
the original complete scope.

The same cohort then enrolls Dropdown Menu, Context Menu and Menubar. Menu owns item/trigger
listeners, typeahead and touch long-press timers; Menubar owns its root/menu listeners and
typeahead. Disposal during selection, sibling closing or focus must stop subsequent checking, focus
and menu acquisition. Keep canceled transitions and native activation semantics. Add
`src/ui/menu.ts` and `src/ui/menubar.ts` to this cohort's manifest and extend the public resource
suite before edits.

The two-document fixture also exposed deferred automatic enhancement of an already removed node. Add
public add/remove-before-delivery controls: observer-driven enhancement must ignore nodes that are
no longer connected to that observer's document. Explicit detached enhancement remains valid. Apply
this guard in `src/ui/index.ts` rather than weakening the public detached-root capability.

### Reopening decision: replaced UI parts and temporary clipboard DOM (2026-09-08)

Ticket 0033's public core/UI probe replaces child parts under an existing component root, explicitly
enhances that root and waits for `whenEnhanced()`. Password Field keeps listeners and references to
the detached input/button: the new button does nothing, and public show changes the old input. Chart
accepts a new empty plot SVG but does not draw unchanged table data until an explicit refresh. A
separate clipboard helper probe confirms that a throwing legacy `execCommand` leaves its hidden
textarea in the document. Successful and false-return controls remove that node. Evidence:
`.git/jqstar/program-audit/ownership-census/resume-2026-09-08/{ui-parts-before,clipboard-before}.json`.

Reopen AC-07 and add AC-09 for the concrete UI-part and temporary-resource behavior. Earlier
completion records are historical. This correction belongs to the owner of UI enhancement and patch
lifecycle; it does not change umbrella ticket 0033's runtime scope or add a new audit-roster ticket.

### UI correction design and planned files

- `src/ui/password-field.ts`: compare current native control, toggle and optional status nodes
  during enhancement. Preserve an existing record and its live Caps Lock status when those parts are
  unchanged. For valid replacement parts, remove listeners from the old nodes before replacing the
  weak record, initialize current native state/ARIA and bind exactly one new listener set. Public
  visibility actions after completed enhancement must affect the current input. Preserve value,
  selection, autocomplete, form behavior, cancellation and disabled-state rules.
- `src/ui/chart.ts`: include plot/legend/status/table part identity in the decision to render,
  preserving data/type signature caching for an unchanged tree. Replacing a plot, legend or status
  with unchanged data must render its current content. A canceled render must remain retryable on a
  later enhancement; do not record replacement parts as successfully rendered before the render
  actually completes. Keep the accessible table as source data and avoid enhancement loops or
  duplicate live updates.
- `src/ui/clipboard-write.ts`: place temporary textarea acquisition/use inside a cleanup boundary
  that removes it when selection/copy succeeds, returns false, is unavailable or throws. Preserve
  the original thrown copy error and modern Clipboard API behavior; do not add a new public API.
- Extend `test/ui-password-field.test.ts`, `test/ui-chart.test.ts` and `test/ui-clipboard.test.ts`
  or add a focused lifecycle test file if isolated realm setup is clearer. Check removed-node
  events, repeated enhancement, current-part actions, individual optional part replacement, canceled
  render retries and clipboard failure cleanup, together with unchanged live controls.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md` and this ticket:
  document re-enhancement and temporary cleanup guarantees and keep current evidence. Update the
  program-audit checkpoint separately without granting final acceptance.

The direct replacement regression also covers the optional Chart status node. Retain its identity
alongside the other current parts and use it during rendering. Invalidate the cached signature when
any rendered part changes; a canceled render leaves that signature invalid so a later enhancement
can retry. The original UI sources fail 11 of 27 focused cases; retain
`/tmp/jqstar-ui-parts-negative.log` before changes.

### UI correction extension: pending Code Block copy

A public delayed Clipboard API probe replaces the Code Block status while copy is pending, then
enhances and completes the copy. The live status stays empty while the detached old status receives
"Copied to clipboard." Evidence:
`.git/jqstar/program-audit/ownership-census/resume-2026-09-08/code-block-pending-before.json`.
Extend AC-09 and the manifest to `src/ui/code-block.ts` and `test/ui-code-block.test.ts`. Keep one
weak record per root and update its code/status references during enhancement, so the pending copy
writes the current status. Preserve the operation's originally copied text and existing success,
error and cancellation behavior. Test both resolved and rejected pending copies after status
replacement, including the detached original remaining untouched. Add this current-part guarantee to
the same component/ownership/testing docs before integration.

### UI correction extension: native form listener ownership (2026-09-08)

The next public core/UI probe found duplicate Search Field search events after replacing its input,
and no search event from the new form after moving the same root. Rating reset listeners grow from
one to two after radio replacement. Cleanup currently resolves the control's form again, after DOM
changes have removed or reassigned that relationship. Four controllers also reuse unchanged parts
without checking whether their native form owner changed. Evidence is retained in
`.git/jqstar/program-audit/ownership-census/resume-2026-09-08/ui-form-ownership-before.json`.

Return to Plan and add AC-10 before this follow-up. Keep current full delivery running against its
unchanged tracked tree; this extension is prepared in the separate checkout.

Planned files and design:

- `src/ui/search-field.ts`, `src/ui/rating.ts`, `src/ui/color-picker.ts` and
  `src/ui/time-picker.ts`: retain the native form identity in the controller and include it in the
  unchanged-parts comparison. Re-enhancement after root moves or explicit `form` attribute changes
  releases the previous listener and binds the current form. Reuse the existing controller when its
  parts match, preserving native values and its last reflected value across form changes. Cleanup
  uses the captured form owner.
- `src/ui/file-upload.ts` and `src/ui/multi-select.ts`: their enhancement already rewires bindings;
  capture the exact form in the binding closure and use it for both registration and removal.
- `test/ui-form-ownership.test.ts`: use the public UI enhancement API to verify one listener after
  repeated native control replacement, release from the old form and acquisition on the new form
  after root moves and explicit association changes, and unchanged enhancement without duplication.
  Verify Search Field emits once with the current control and that existing native reset behavior
  still works. Include Select and Combobox as controls: they already capture the form and rebind.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md` and this ticket:
  document current form ownership after enhancement and keep exact negative/positive evidence.

This change preserves each component's existing value/default/reset rules and reset scheduling. It
introduces no new public API, document observer, timer, or kernel resource. Keep all fixed bundle,
coverage and lint limits. Validate Plan before source edits, retain negative regression results, run
focused component and lifecycle tests, then current fast/Code/full/Test/Document validation.
Existing full delivery cannot close this new criterion until the correction is integrated and
verified on its own current tree.

### UI correction extension: rendered lists and replaced active controllers

Public probes now confirm three further defects in the two form-bound modules already under review:
File Upload leaves a replacement file list empty for an unchanged native selection; Multi Select
leaves replacement tags empty; and replacing open Multi Select content leaves its former controller
in the active set, so a resize still writes to detached content. Tag caching also ignores changed
option labels and disabled state. Retain both `ui-rendered-parts-before.json` and
`ui-rendered-parts-expanded-before.json` in the current audit artifact directory. The first
standalone probe lacked a native option constructor; the corrected probe explicitly supplies and
restores that constructor before recording any finding.

Add AC-11. Extend the existing `src/ui/file-upload.ts` change to retain the list element whose
contents match the rendered signature, forcing render when that part changes or appears. Extend
`src/ui/multi-select.ts` to invalidate tag rendering for a new tags element and include selected
option labels and native disabled state in its signature. Before replacing a controller because its
native control or content changed, hide its old floating content and clear its active-set membership
and search timer directly, then release its listeners. This structural cleanup cannot be canceled by
an ordinary before-close handler. Preserve the existing closed state of the replacement record.

Add `test/ui-rendered-parts-lifecycle.test.ts` for replaced/late file lists, replaced tags, changed
labels and disabled removal buttons, and removal of old viewport work and search timers during open
controller replacement. Exercise native-popover and fallback cleanup, plus unchanged-part rendering
stability, and extend the same public/brain documentation. Keep native file/select values, explicit
cancellation for ordinary user operations, and all fixed size/coverage limits. Validate the extended
Plan before these changes and retain original failing test output.

### Recorded artifact measurement

`quality/jquery-mobile-migration.json` must record the final built UMD byte count used by the
installed Mobile reference consumer. The current root full run detects an older recorded value.
Measure the completed correction build, retain its digest and exact size, then update that evidence
field without changing any fixed package budget. Current root package validation must confirm it.

### UI correction extension: queued reset after native control replacement

The explicitly pending reset review now reproduces stale writes in Rating, Color Picker and Time
Picker. A native form reset schedules its callback; the caller replaces native controls and
completes enhancement; the old callback then restores the old value through the current root's
reflected state. The public probe records Rating changing from 2 back to 1, Color Picker from
`#445566` back to `#112233`, and Time Picker from `14:00` back to `12:00` after completed
enhancement. Evidence is `ui-pending-reset-before.json` in the current ownership audit directory.

Add AC-12. Extend `src/ui/rating.ts`, `src/ui/color-picker.ts` and `src/ui/time-picker.ts` so the
queued reset callback checks that its controller is still the root's current record before writing.
Preserve a live callback for the same controller, including unchanged enhancement and form binding
updates. This guards stale callback effects; it does not promise browser task cancellation or heap
collection. Extend `test/ui-rendered-parts-lifecycle.test.ts` with each negative replacement path
and each positive current-controller reset path. Update the same component/ownership/testing docs,
retain negative output, verify the exact size budget, then run current fast and full validation.
Other controllers' pending reset behavior remains part of the unfinished source audit and is not
accepted by this three-controller correction.

### UI correction extension: Number Field replacement

The next complete source review and public probe show the same stale-part defect in Number Field.
Its early existing-record return skips current-part resolution. After replacement and completed
enhancement, the visible increment button does nothing; public set changes the detached original
input and reports that value while the visible input remains unchanged. Retain
`number-field-parts-before.json`. The record's cleanup also omits its anonymous native change
listener, which must be removable when part ownership changes.

Extend AC-09 and the planned manifest with `src/ui/number-field.ts` and
`test/ui-number-field.test.ts`. Validate current input/increment/decrement parts before deciding to
reuse a record. Preserve unchanged-record value, constraints and reflected-value semantics. For
valid replacement parts, release the old exact click/input/change listeners before replacing the
weak record, configure current native controls/ARIA and bind one listener set. Name the native
change callback so cleanup removes it. Preserve native stepping, cancellation, readonly/disabled
state and form serialization. Test all-parts and individual-part replacement, old detached events,
current API/actions and unchanged enhancement.

The current UI module has only 92 bytes below its unchanged limit. As part of this correction,
simplify the existing identical-branch string conversion in `requestSet` to the equivalent native
`String(value)` assignment on its validation probe. Do not change its native input normalization or
raise any budget. Measure the current build, update the existing Mobile UMD evidence, and retain the
source/test/doc proof before current fast/full verification. Update the same three component,
ownership and testing guides. No Number Field source change precedes this Plan validation.

### UI correction extension: current viewer parts and deferred following

The complete JSON Viewer and Log Viewer source reads now have public reproductions in
`viewer-parts-before.json` and `viewer-parts-expanded-before.json`. JSON Viewer retains the old
script/tree/status after replacement and reports the old parsed value. Repeated enhancement of a
detached empty-source viewer emits three updates for three calls instead of stabilizing. Log Viewer
appends into detached old entries, ignores the replacement filter control and reports counts from
its old list. A queued follow scroll still executes after `follow(false)` disables following. The
empty-source probe stays detached to avoid assuming or hanging on an observer feedback loop.

Add AC-13 and extend the manifest with `src/ui/json-viewer.ts`, `src/ui/log-viewer.ts`, and
`test/ui-viewer-lifecycle.test.ts`. JSON Viewer must resolve and validate current source/tree/status
parts on enhancement, update its retained record and invalidate cached rendering when a part
changes. Normalize an empty or whitespace-only source to `null` before signature comparison so
unchanged empty input stabilizes. Preserve parsed/error rendering, native details behavior, API
cloning and scoped part lookup.

Log Viewer must retain one controller while updating current entries/viewport/filter/pause/status
references. Make native filter and scroll listeners removable, release their exact prior bindings
before rebinding, and preserve paused/following state. Current entries or viewport replacement
should refresh counts/ARIA and honor current following behavior. Deferred scrolling uses current
references and rechecks connected/following/paused state before writing, so disabling following or
pausing before the microtask prevents its effect. Test individual and all-part replacement, old
detached native events, repeated enhancement without duplicate listeners, and pending follow
controls.

Only 26 bytes remain below the UI module's unchanged fixed limit. Within these two private
controllers, use concise descriptive field names for cached JSON text/source and Log Viewer
list/view/filter/pause/count state if needed to offset the lifecycle correction. Keep every public
API, event name and event/state field unchanged; verify the full type/API build and measured module
sizes. Reuse existing generic behavior and avoid a new public entry or observer. Update the same
component/ownership/testing guides and current Mobile UMD measurement, then run current fast/full
verification. No viewer source changes precede this Plan validation.

### UI correction extension: Disclosure and Editable handoff

`ui-next-parts-before.json` confirms two more current-part failures after completed enhancement.
Disclosure's detached old summary still emits before-open on its live details root. Its cleanup
reads `record.trigger` after that reference was replaced. Editable's public set updates the detached
old control and reports the new value while the visible control and preview remain unchanged.

Add AC-14 and extend the planned files with `src/ui/disclosure.ts`, `src/ui/editable.ts` and
`test/ui-disclosure-editable-lifecycle.test.ts`. Disclosure cleanup must capture the exact summary
used for click/keydown registration, so replacing summary or content removes the old callbacks.
Preserve native details/toggle behavior, current summary ARIA, accordion sibling cancellation and
keyboard navigation. Test repeated replacement, detached callbacks and unchanged native controls.

Editable must resolve and validate current display/preview/editor/control/edit/status parts on every
enhancement. Retain one record and its committed value while updating current references. Remove the
old control's exact keydown callback before binding the current control. For an unchanged or
replaced control outside editing, keep the existing precedence: a changed explicit root value wins,
otherwise the current native value becomes committed. While editing, preserve the committed value
and current native draft, and apply the current mode to replacement display/editor parts. Configure
current native IDs, ARIA and button types; public edit/commit/cancel/set and pending native events
must use current parts. Preserve validation, cancellation and native change events. Test
individual/all-part replacement, replacement during editing with cancel/commit, and unchanged
drafts/listener counts.

Keep all fixed budgets and public APIs. Concise descriptive private Editable field names or the same
equivalent record-assignment pattern may offset current-part bookkeeping. Update the same
component/ownership/testing docs, measure current UMD and UI bundles, and update the existing Mobile
measurement. The viewer fast run passes all 1,818 units but finds its JSON normalization removed one
redundant condition. Extend the manifest to `quality/lint-boundaries.json` solely to reduce JSON
Viewer's observed `no-unnecessary-condition` allowance from three to two, as the checker requires.
Do not raise any allowance or change the checker. Retain negative probes/tests and all intermediate
failures, then run focused checks and current fast/full proof. No runtime changes precede this
extended Plan validation.

### UI correction extension: Countdown current parts and clock restart

The public `countdown-parts-before.json` probe confirms that replaced Countdown parts stay blank
while public start writes detached old seconds. A controlled interval probe also removes a running
root, runs the shared tick to release its scheduled record, reinserts and enhances it, and observes
zero timers even though the countdown is still running. The full root delivery stays frozen on its
predecessor tree while this correction is prepared in the separate current-tree checkout.

Add AC-15 and extend the planned files with `src/ui/countdown.ts` and
`test/ui-countdown-lifecycle.test.ts`. Resolve and validate the current required seconds and
optional days/hours/minutes/value/status on every enhancement. Retain the controller's duration,
deadline, paused/completed flags and remaining time, but update its current part references and
configure the current status ARIA. Re-enhancement of a running record must register it with the
shared clock again if a disconnected tick previously removed it. Keep at most one scheduled record
per root and one interval; paused and completed records must not restart ticking. Preserve the
existing deferred removal cleanup on a tick and the current start/reset/until/event semantics. Do
not claim immediate root removal, host disposal or cross-realm timer cleanup beyond the present
contract.

Test all/individual part replacement with a paused countdown for deterministic remaining time,
current start/complete status, inert detached content, repeated enhancement without duplicate
intervals, running detach/tick/reinsert restart, and paused/completed reinsertion controls. Existing
Countdown behavior must still pass. Use concise descriptive private duration/remaining/completion
record field names if needed to keep fixed bundle limits while preserving every public event/state
field. Update the same component/ownership/testing guides and exact Mobile UMD measurement after a
completed build. Retain negative results and validate Plan before source changes, then focused
tests, size/type/lint checks and current fast/full verification after selective root integration.

### Verification correction: unreachable Editable cleanup initializer

The current root full run's coverage gate reports the newly relocated Editable placeholder cleanup
function as uncovered. That initializer is replaced with the real native keydown cleanup before it
can be used. Remove the unnecessary placeholder instead of testing unreachable scaffolding. Make the
private cleanup field optional during controller construction and invoke it conditionally before
rebinding, then assign the exact native callback cleanup as before. Extend the existing Editable
ledger and preserve all public behavior. Verify focused cases, production types and changed-code
coverage in the isolated checkout before root integration. Keep every coverage threshold unchanged.

### UI correction extension: current Tabs values and Dialog labels

`tabs-dialog-before.json` confirms two further failures after explicit enhancement and its barrier.
A retained Tabs trigger whose `data-value` and matching panel change from b to c still invokes b:
click leaves a active, while public activation of c works. Dialog title/description replacement
leaves its generated ARIA references pointing at removed IDs while the current parts have no IDs.

Add AC-16 and extend the planned files with `src/ui/tabs.ts`, `src/ui/index.ts` and
`test/ui-tabs-dialog-lifecycle.test.ts`. On Tabs enhancement release all prior exact native trigger
callbacks, clear their cleanup map and bind current part/value pairs. This avoids retaining obsolete
panel references and callback values while preserving one click/focus/keydown binding per current
trigger. Keep active selection, manual/automatic activation, native keyboard behavior, disabled and
cancelable semantics. Verify value changes and panel replacement with unchanged trigger identity,
repeated enhancement without duplicate requests and removed trigger inactivity.

Dialog must update generated title/description associations before its already-enhanced shortcut.
Track only the IDs assigned by the controller. Preserve authored `aria-labelledby` and
`aria-describedby` values when they differ from that tracked ID. Replaced parts receive IDs and
current associations; removed parts remove only their owned generated reference. An authored
`aria-label` prevents generating a title association and removes a prior controller-owned one, while
explicit authored `aria-labelledby` retains native precedence. Keep native listeners registered
once, retain focus-return trigger state, and preserve cancelable open/close behavior. Test separate
and combined part replacement/removal, authored labels/descriptions, caller replacement of an owned
ARIA value and repeated enhancement without duplicated native events. No observer or public API is
added. Update the same guides, measured UMD evidence and exact source review after integration;
preserve fixed budgets and run focused, type, lint and current full verification.

### UI correction extension: Input OTP and Tags Input current parts

`otp-tags-before.json` confirms both existing-record shortcuts retain detached native parts. After
replacement/enhancement, Input OTP set changes old input to 1234 while current input stays 1 and
current slots/status stay empty. Tags Input add renders the detached old list and leaves the current
list empty and current draft uncleared, although its public values include the new tag.

Add AC-17 and extend the manifest with `src/ui/input-otp.ts`, `src/ui/tags-input.ts` and
`test/ui-otp-tags-lifecycle.test.ts`. Resolve current native control and output/status parts before
reuse. Preserve one controller, release its exact old native callbacks before updating part
references, and bind current parts. Reconfigure current IDs/ARIA/native autocomplete and preserve
the existing root-value precedence, OTP normalization/length/completion/suppression semantics and
Tags values/deduplication/limits/hidden-input serialization. Native drafts in Tags Input should
remain until a successful current operation clears them. New list identity invalidates Tags
rendering even if a cloned list inherits the old cached values attribute. Unchanged enhancement must
keep one listener set and stable rendered children.

Use optional cleanup during initial controller construction, then assign real cleanup after native
binding; do not introduce another unreachable placeholder function. Concise private
input/completion/ committing field names may preserve the fixed size budget, but keep all public
event fields and API types unchanged. Test individual/all-part replacement, current native
input/key/remove events, detached old callbacks, current status and public event output, cloned list
cache and unchanged controls. Extend the same three guides, retain negative output and measured
module sizes, and run focused types/lint and current root fast/full verification after integration.
No source change precedes this Plan validation.

### UI correction extension: native Form association and floating labels

`form-external-before.json` confirms that `valid()` ignores an external required input associated
through `form=id`, while native validity rejects it. Validation leaves its Field message empty, and
`setErrors()` does not set its native custom validity. Use `form.elements`, filtered to native
input/select/textarea controls, as the current association roster. Preserve `willValidate` filtering
for validation, but include disabled controls when clearing owned server errors. Query the native
roster on each operation; do not retain an external-control array.

Pass the existing DocumentHost into `createForms`. Install one host-owned invalid capture listener
and input/change listeners for externally associated controls. At event time resolve the control's
current native form and weak enhanced record; skip contained controls because the existing local
form listeners handle them. Share the existing validation/update behavior between local and external
events. Preserve detached local-form behavior, queued invalid coalescing, native submit/reset,
server error clearing and Field ARIA. This design adds no per-control external listener, observer or
strong form collection. Document-host disposal must remove the external event delegation. Test all
three native control kinds, native validation and focus, server errors/edit/reset/disabled clearing,
dynamic reassociation, unrelated controls, one event after repeated enhancement, and host disposal.

`floating-label-before.json` confirms Popover and Hover Card retain a generated `aria-labelledby`
reference after replacing their title with a new authored ID. Add a private optional generated-title
ID to each controller and a generic title association helper in existing `src/ui/floating.ts`.
Resolve the current title and generate its ID as before. Update/remove only the previous generated
reference; preserve any different authored `aria-labelledby`. An authored `aria-label` prevents a
generated title association and removes a previous owned one. Preserve open state, native fallback,
trigger bindings, timer and document-service behavior. Test title replacement/removal, content
replacement, explicit labels before and after enhancement, unchanged repetition and current open
operations. No stronger timer/removal cleanup is claimed by this correction.

Add AC-18 and AC-19. Extend the planned and changed-file manifest with `src/ui/form.ts`,
`src/ui/popover.ts`, `src/ui/hover-card.ts`, `src/ui/floating.ts`,
`test/ui-form-association.test.ts` and `test/ui-floating-labels.test.ts`; `src/ui/index.ts` receives
the host argument. Extend the same component, ownership and testing guides. Also include
`etc/jquery-star-ui.api.md`: the first integrated build fails solely because the existing
`ae-forgotten-export` warning location moves from line 600 to 610. Refresh only the generated
warning location after final source layout, with no public signature change. Retain that failed
build and all negative regression output. Validate this Plan before code, then run focused tests,
production types, lint/boundary counts, fixed size checks and complete current fast/full proof.

### UI correction extension: deferred Message Scroller and Feed labels

`feed-scroller-before.json` confirms a pending initial Message Scroller timer changes a reader's
native unfollow from false/top 0 back to true/top 1000. The native scroll handler changes the flag
but does not cancel the pending callback, which calls the imperative latest method unconditionally.
Preserve deferred behavior while requiring automatic scroll callbacks to check both root connection
and current following state before they write. Share automatic scheduling between initial setup and
appended-message observation. Keep explicit `latest()` and `follow(true)` behavior, current unread
counts, pending cancellation on explicit pause, and exact cleanup on part replacement. Test both
initial and appended-message callbacks after native unfollow, disconnected callbacks,
still-following controls, explicit latest recovery, and replacement cancellation. Do not claim
immediate observer or host teardown beyond the current component contract.

The same probe confirms Feed articles retain generated label/description IDs after replacing the
current parts. Track only generated title/description IDs in a module WeakMap keyed by each native
article; add no strong article list or new module. On every item sync, update/remove the owned
reference for current parts, preserve different authored ARIA and honor an authored aria-label.
Resolve titles/descriptions as before and preserve feed positions, set size, cursor/loading/done,
keyboard focus, observer and application-owned HTML boundaries. Test separate and combined current
part replacement/removal, authored labels before/after, copied/replaced articles, and repeated
unchanged synchronization. Do not claim an IntersectionObserver removal fix in this change.

Add AC-20 and AC-21. Extend the planned manifest with `src/ui/message-scroller.ts`, `src/ui/feed.ts`
and `test/ui-feed-scroller-lifecycle.test.ts`. Use concise private record field names only when
needed to preserve fixed bundle limits; public fields/events remain unchanged. Extend the same
component/ownership/testing guides. Preserve the negative probes and failed tests. Validate Plan
before source edits; run focused tests, types, lint and unchanged budgets. Root remains frozen on
its preceding full delivery, so integration and fresh root fast/full verification happen only after
that run ends. Remove unreachable construction placeholders if the required control-flow changes
expose them to the changed-function gate; do not manufacture coverage tests or alter thresholds.

### Verification extension: native OTP branches and unused Form cleanup

The live predecessor coverage gate reports Form line 300 and OTP lines 69, 174 and 310 plus its
public focus function. Form's returned local cleanup and placeholder are never invoked anywhere; its
record is created once and local native behavior intentionally persists with that form. Remove that
unused cleanup field/closure rather than creating a fake invocation. Make the local wire function
return void and keep the same one-time native registrations. Host-owned external cleanup remains
unchanged and its real disposal regression remains required.

Extend the existing OTP lifecycle suite with public focus assertions after part replacement, native
maxlength/default-length fallback on current inputs, and canceled native input restoring the current
control. These are supported public/native branches affected by the input-reference correction. No
runtime OTP change or new threshold is needed. Keep the complete failed predecessor report and all
new focused/type/coverage results. Root remains frozen while isolated corrections are prepared.

### UI correction extension: Resizable parts and Transfer List values

`resizable-transfer-before.json` confirms Resizable binds three window pointer listeners while idle,
retains them after root removal and kernel disposal, and writes replaced old panels while current
panels remain at their prior size. Resolve/validate current panels, handles, alternating sequence
and constraints before controller reuse. Preserve current sizing/root-value precedence when
compatible, normalize against current constraints, and refresh current native callbacks after part
identity changes. Keep unchanged enhancement during a drag stable. A changed part set cancels the
old pointer session, releases exact old callbacks and clears restore data tied to old panel indices.
Public set/resize/collapse/reset and keyboard behavior must use current parts.

Move native window pointer movement/completion/cancel listeners into an actual drag session. A
consumed session cleanup removes them and releases pointer capture on pointer completion/cancel,
replacement, or a new session. Initial idle enhancement installs no window pointer listeners. On
movement after root disconnection cancel that session without further sizing writes. Preserve
resize-start/end and cancelable size-change behavior for live sessions. This corrects the documented
session lifetime; it does not introduce a removal observer or claim immediate host-wide cancellation
for an active pointer session that receives no further events. Private cleanup may be optional
during construction; avoid unreachable placeholders. Extend `src/ui/resizable.ts` and add
`test/ui-resizable-lifecycle.test.ts`, with current-part, invalid-part validation, exact callback,
idle/session listener, completion/cancellation, disconnection, replacement and unchanged-drag tests.

The same probe confirms Transfer List treats distinct accepted value arrays as equal when joining
with a NUL separator: one option value containing that character collides with two separate values.
Replace the two separator comparison sites with an injective string-array serialization such as
JSON, preserving all allowed strings, order, unique/nonempty validation, native options, hidden
inputs and cancelable events. Add `test/ui-transfer-list-values.test.ts` covering public set and
root-patched arrays in both directions, unchanged arrays and cancellation. Extend
`src/ui/transfer-list.ts`.

Add AC-22 and AC-23, update the same three guides and keep all budgets unchanged. Validate this
extended Plan before source edits and retain negative/focused/type/lint/build/coverage evidence.
Root remains frozen on its prior full delivery; these changes stay isolated until selective
integration and fresh complete root verification can run.

### UI correction extension: canceled Stepper and Menubar transitions

`stepper-menubar-before.json` confirms two canceled-transition inconsistencies. Stepper changes its
internal finished flag before a cancelable step transition and never restores it: canceling a move
from a completed stepper leaves its value at the final step, but the next enhancement renders it
active. Move that flag transition to the accepted branch after before-change succeeds. Preserve
existing active-index/completed-value rollback, validation, focus and event ordering. Test public
and native canceled transitions from completion, unchanged enhancement, accepted transitions, and
canceled completion controls.

Menubar closes its own state after asking children to close even when a Menu before-close handler
cancels the child. Reconcile open index, root state/value and active roving trigger from the current
child Menu states after the close requests. If all close, retain existing closed/empty-value
behavior. Test canceled close through public API and keyboard, accepted subsequent close, current
value and unchanged enhancement, without bypassing the child's cancelable contract.

Add AC-24. Extend the planned manifest with `src/ui/stepper.ts`, `src/ui/menubar.ts` and
`test/ui-transition-cancellation.test.ts`, plus the same component/ownership/testing guides. Keep
fixed budgets and preserve negative evidence. Validate Plan before source edits; run focused,
type/lint/build checks and complete root proof after the live predecessor ends and integration is
possible. These are local state transitions with no new timer, listener or observer.

### UI correction extension: Sortable preview parts and exact arrays

`sortable-before.json` confirms the same separator collision in Sortable's two order comparisons:
reversing the accepted values `a` and `a\u0000a` is ignored. Extend AC-23 to Sortable and replace
its separator comparisons with JSON equality, retaining exact allowed values and existing events.
Test public movement, authored root order, native preview drop and Escape restoration.

The probe also replaces the list during an active keyboard preview. Current DOM order becomes b,a,
but public value remains the detached old a,b and the root remains sorting. Resolve current list and
items before the preview shortcut. Preserve an active preview only while the same list and same item
identities remain; ordinary preview reordering of those items is allowed. A changed list or item
membership proceeds through normal validation, releases exact old list callbacks and creates an idle
controller from current DOM/root-value rules. Do not call the old preview renderer against
replacement DOM or emit a synthetic public drop. New native/public operations use current nodes.

Add AC-25 and `src/ui/sortable.ts` plus `test/ui-sortable-lifecycle.test.ts` to the manifest. Test
list/item replacement during preview, current public/native operations, detached callback inactivity
and unchanged preview continuation. Extend the same three guides, preserve negative results and
unchanged budgets, and validate Plan before edits. Root remains frozen during the current full run;
final selective integration and root verification remain required.

### UI correction extension: nested Sortable form inputs

`sortable-nested-before.json` confirms that moving an outer Sortable removes the generated hidden
inputs of a nested Sortable. The detached native form initially serializes both orders; after the
parent move, only the outer order remains. The lookup currently includes all descendant generated
inputs. Limit reconciliation to inputs whose closest Sortable root is the current controller root.
Preserve nested input identity and values when the parent moves, re-enhances or removes its own
submission name, and preserve outer inputs when the child moves. Keep generated inputs idempotent
when both controllers use the same field name and values. No observer feedback or immediate disposal
guarantee is inferred from this detached-form reproduction.

Add AC-26 using the existing Sortable source, lifecycle test and three guide files. Validate Plan
before the runtime edit, retain failing native FormData regressions, then run focused checks and
fresh root build, size measurement, fast/Code and complete delivery. Existing budgets stay fixed.

### UI correction extension: final source-pass findings (2026-09-08)

The complete 109-source ownership pass produces three retained public probe sets:
`toast-menu-before.json`, `select-combobox-before.json` and `final-ui-before.json`. They confirm
stale label references, one document closing another document's Menu, old reset tasks affecting
replacement controls, duplicate generated IDs, Date Picker callbacks retained on detached parts, a
copied empty Calendar grid never rendered, detached Questionnaire navigation, canceled
submitted-state loss, disabled Tree activation and disabled Data Table rows selected by the bulk
control. The standalone probes explicitly supplement and restore missing ambient constructors; their
first unsupported realm attempts remain recorded and do not count as product evidence.

Keep these generic UI corrections under owner 0006. Registry/backend behavior and the public event
schemas stay unchanged. Extend the planned manifest and implement these boundaries:

- `src/ui/toast.ts`, `menu.ts`, `select.ts`, `combobox.ts` and `questionnaire.ts`: update or remove
  generated label/description references when their current native source changes. Preserve
  different authored ARIA and distinguish generated fallbacks from authored labels. If sharing this
  comparison in `src/ui/floating.ts` reduces repeated code, migrate its existing Popover/Hover Card
  helper and the equivalent Dialog/Feed logic under the same tests, without introducing a new public
  export.
- Menu, Select and Combobox open-state sibling operations must use their own document's active
  records. Confirm the latter two with the same sequential-realm probe and retain same-document
  sibling-close and canceled-close controls. No cross-document DOM write or focus change is allowed.
- Select/Combobox reset work must retain the native control/form owner at scheduling and check
  current parts/association before writing or dispatching events. Questionnaire must reject queued
  work from an obsolete record. Retain native reset behavior for current controls and prevent
  canceled native resets from applying component state. Test reassociation and repeated enhancement
  as well as part replacement; no immediate removal observer or unrelated timer promise is added.
- Combobox and Tree generated IDs must stay distinct after insertion around existing identified
  nodes. Preserve authored IDs and unchanged node identity. Resolve new IDs against current owned
  nodes; avoid trusting an index whose earlier node already retained that generated ID.
- `src/ui/calendar.ts`: release exact old picker callbacks before binding current valid parts for
  both picker kinds. Public/native events and delayed focus must use current owned parts. Track grid
  identity with the render cache so copied marker attributes cannot certify an empty replacement.
  Remove the Calendar cleanup field/closure if source inspection confirms it is never consumed; root
  delegation itself remains registered once. Preserve accepted/canceled selection and Popover
  closure behavior, and keep unchanged grids stable.
- Questionnaire button cleanup must capture exact bound nodes. Move submitted-state mutation after
  accepted navigation, extending AC-10 and AC-24. Replace its unreachable construction cleanup with
  an optional field if needed, rather than adding a synthetic cleanup test.
- `src/ui/tree.ts`: disabled items cannot emit activation from double-click or keyboard. Keep
  enabled activation, focus, selection and cancelable expansion behavior intact.
- `src/ui/data-table.ts`: bulk selection and its counts must respect disabled native row controls.
  Remove the historical initialized-row-ID Set if initial-only selection seeding can use the
  existing selectionSeeded flag alone. Preserve selected IDs across manual pages; do not clear
  reader choices as a side effect of removing redundant unselected-row history.

Add focused lifecycle suites for current popup labels/document ownership, queued native reset and
Questionnaire bindings, generated IDs/disabled controls, and Calendar/picker parts. Extend existing
suites where that keeps fixtures clear. Planned paths are `test/ui-popup-lifecycle.test.ts`,
`test/ui-native-reset-lifecycle.test.ts`, `test/ui-identity-constraints.test.ts` and
`test/ui-calendar-lifecycle.test.ts`, plus affected original UI tests if required. Update the same
component, ownership and testing guides and this ticket. Supplement the local probe only as needed;
the finite public realm-global list does not itself promise every UI constructor.

Use one private `identifyElements` helper in `src/ui/floating.ts` for the two generated-ID paths.
Collect current owned IDs once, assign only unidentified nodes, and skip every occupied suffix.
Retain the existing initial suffix conventions: Combobox starts at zero and Tree starts at one.
Reuse their existing item/option arrays without retaining a new collection. This also prevents a
current authored ID from colliding with the next generated value. Tree preparation no longer needs
its item-index parameter. The Data Table native change handler also ignores disabled controls,
consistent with bulk exclusion and the negative scripted-change case.

The initial isolated tests have six valid identity/disabled failures and one paging control. Three
popup setup failures reused an already-installed jQuery object and provide no product evidence.
Corrected fixtures use one real jQuery factory instance per document; all three then reproduce the
cross-document closure while their same-document controls pass. Retain both logs. Extend the
existing AC-10/AC-24 handoff/cancellation criteria to Questionnaire as described above.

The Calendar regression also finds a cache signature recorded before the render assigns its
preferred focus date, so the next unchanged enhancement needlessly replaces day nodes. Record the
signature after rendering establishes that focus state, and pair it with the actual grid identity.
The first Range Picker fixture used incorrect part names and is retained only as fixture-error
history; use documented start-control/end-control names for negative proof. Spy on current day nodes
after synchronous open has rendered, before the pending focus task, to avoid false controls.

Share the two deferred picker focus paths in one private Calendar helper. At execution, require the
captured native controls and calendar still belong to the picker and its Popover remains open, then
focus the current roving day. This uses current rendered focus state and creates no persistent timer
or collection. Re-enhancement consumes exact picker cleanup and binds the current validated parts.
The generic Calendar root handlers remain registered once with no unused cleanup closure.

The nine added label cases all fail before correction, while the three document-isolation controls
pass. Implement shared generated-attribute ownership in `src/ui/floating.ts`: a WeakMap keyed by the
target element retains only its generated attribute strings. A current different authored value
wins. Synchronize labelled-by and label as a pair so switching between a current reference and a
fallback removes the obsolete generated alternative, while preserving authored alternatives. Share
native-control label derivation for Select and Combobox. A generated Combobox input fallback must
track the current root label and clear when an actual native label appears.

Migrate the equivalent Dialog, Feed and Popover/Hover Card comparison to this helper and remove
their redundant private label fields/maps. Keep current-part ID assignment, separate description
semantics and all existing authored-ARIA tests. Toast uses the same helper for title, description
and generated fallback; Questionnaire uses it for descriptions. The map has weak element keys and
scalar strings only, with no new listener, timer, root collection or public UI export. This is the
planned shared comparison, not a change to authored ARIA precedence or public component methods.

A further Questionnaire case confirms that removing the original default item makes public reset
throw after an otherwise valid enhancement. Resolve its default against current items, then let the
existing render normalization choose the first enabled item when the old default is absent or
disabled. Public navigation to an unknown requested value still throws. This stays within AC-29's
current-part reset contract. The added detached Skip control passes after exact cleanup.

The first sibling-cancellation control canceled only one event. Combobox opening also moves native
focus, causing a separate close request which that consumed listener allowed. Keep cancellation
active for the whole control operation, then remove it before testing document isolation; this is a
fixture correction and does not justify changing close behavior.

The shared focus helper initially checks only whether the calendar is inside the picker. Two new
cases move that same calendar into a replacement closed Popover and show the old open Popover still
authorizes queued focus. Require the captured Popover to remain a direct picker part and contain the
captured calendar. Control-replacement cases already pass. Retain the two failures and fourteen
passing controls, then refresh the full focused coverage after this final owner check.

Add AC-27 through AC-33. Validate Plan before runtime edits and retain failing new cases before
corrections. Keep unchanged compatibility/cancellation controls, type/lint/changed-code checks and
all bundle ceilings. The current UI ESM has 237 bytes of headroom, so remove redundant retained
state and share repeated ownership logic when needed; no budget increase is allowed. Root remains
frozen in its full delivery while this work is prepared separately. Revalidate root Plan before
selective integration, then refresh current source/claim records, build measurements and complete
fast/Code/full/Test/Document evidence. Current source census completion is draft review only.

### UI correction verification plan

Validate this Plan before runtime changes. Retain negative public probes and failing new test cases
against original UI source; then run focused UI/lifecycle tests and unchanged compatibility cases.
Use real public enhancement plus `whenEnhanced()` for replacement observations. Check old detached
controls are inert, current native input state survives enhancement, rebuilt chart content is
complete, cancellation remains retryable, and unrelated textarea controls remain untouched on copy
failure. Run current quality:fast and actual Code validation before Test, then changed-code coverage
and complete `npm run check` with unchanged size/coverage/lint limits. Preserve all failed evidence
and update public/brain docs before owner completion. No mutation tooling, commit or publication.

### Problem

Application setup can create effects or listeners before a later mount throws, while the instance is
not yet stored for destruction. Cleanup stops on the first thrown callback. Removing an application
root from its parent is invisible to that root's observer. Navigation and public directives cannot
build reliable cleanup on this behavior.

### Current evidence

- Application constructors install rules and mount the tree before caller registration completes.
- Cleanup loops invoke callbacks directly and can stop on a thrown error.
- `patchElements()` removes or replaces nodes without consulting application ownership.
- `nextUpdate()` does not wait for MutationObserver delivery or UI enhancement.

### Reopening decision: request and timer ownership (2026-09-06)

Ticket 0033's source audit and actual public-application probes reproduce two lifecycle defects.
Root requests are stored in a set of controllers. When two active requests share a caller-supplied
controller, completing one removes the only root entry, so destruction cannot abort the remaining
request. Both attribute and behavior applications reproduce this; distinct-controller and
both-pending controls cancel correctly. Evidence is retained in
`.git/jqstar/program-audit/ownership-census/shared-controller-finding.json`.

The debounce implementation also retains replaced and fired handles in its application timer set
until destruction. The public event/action probe records counts of one after scheduling, two after
replacement, two after delivery and zero only after destruction. This contradicts the original
inspection ledger's claimed removal of fired/replaced timers. Exact evidence is retained in
`ownership-census/timer-ledger-finding.json`. Preserve both findings' original bundles and results.

Return to planned and reopen AC-02/AC-08 before changing code. Count each active request's root
ownership separately, even when controllers are shared. Settlement releases only that request's
reference; root cleanup aborts each remaining controller and clears root ownership. Preserve the
caller controller and signal, automatic cancellation, retry behavior and independent roots. Sharing
one signal intentionally shares its cancellation; do not promise independence for requests using the
same controller across roots.

For debounce, remove a replaced handle before registering its replacement. Remove a fired handle and
its matching element entry before calling the action, so repeated and reentrant events retain only
live timers. Destruction still clears the remaining timers. Do not change debounce timing or
unrelated event behavior.

Planned files: `src/fetch.ts`, `src/runtime.ts`, new `test/request-lifecycle.test.ts`,
`test/runtime.test.ts`, `README.md`, `docs/BACKEND.md`, `docs/RUNTIME_OWNERSHIP.md`,
`docs/TESTING.md`, this ticket, `docs/tickets/0033-audit-full-library-program.md`, and
`docs/tickets/ROADMAP.md`. Keep README expression locations stable. Any required derived public
corpus refresh must use the maintained generator under unchanged budgets and an extended manifest.

Validate Plan before implementation. Test public core applications in both modes with application
and kernel teardown after a shared-controller sibling succeeds or fails, plus distinct-controller,
caller-abort and independent-root controls. Bind requests to actual fetch start/settlement rather
than elapsed sleeps. Test repeated debounce replacement/delivery, callback-time ledger release,
reentrant scheduling and destruction. Retain original-source negative controls, then focused
lifecycle/request suites, fast, changed-code coverage and complete delivery with exact phase checks.
Update affected public and brain contracts and inspect every reopened criterion before closure.
Mutation testing remains deferred.

### Plan extension: built-in effect registration (2026-09-06)

The current source still leaks a built-in `data-effect` or `data-show` runner when its first
evaluation destroys the application. After destruction, a state update runs each expression again;
the registered `data-text` control remains stopped. A native `jquery-star:model-write` handler also
reproduces the problem in `data-bind`: its initial write destroys the application, but later state
updates still write the input and a native input event still changes destroyed application state.
Exact public-plugin/application probes are retained in
`ownership-census/builtin-effect-reentrant-finding.json` and
`ownership-census/model-reentrant-finding.json`. Invalid early probe fixtures remain separate.

Reopen AC-01 as well as the already pending AC-02/AC-08. Extend the correction to
`src/declarative.ts` and `test/directive-application.test.ts`. After synchronous initial effect
execution, check the application lifetime before recording the runner or installing model listeners.
Stop a runner immediately when initialization released its owner. Preserve ordinary initial
rendering, subsequent reactivity, native input behavior, error reporting and existing transactional
plugin registration. Test built-in effect/value/model paths, direct application destruction and
kernel disposal where they are permitted, active controls and the already fixed registered directive
path. Public state/DOM observations must show that neither effect nor input work resumes after
teardown.

Retain the original-source failure matrix and use the existing focused/fast/coverage/delivery
sequence. Update README and the ownership/testing guides for the affected public guarantee; keep
README expression positions stable. The current full delivery failed package size and its dependent
package-budget control. Fix size within the existing limits before owner closure. Do not count small
isolated build experiments as installed-package evidence or execute mutation testing.

### Plan extension: preserve behavior within package limits (2026-09-06)

The corrected lifecycle exceeds the fixed core consumer budget by 228 gzip bytes. Isolated builds
identify duplicate recursive cloning in behavior applications, declarative applications and signal
patches, plus duplicate plain-record checks in requests and patches. Move that cloning into
`src/value-checks.ts` and reuse its existing plain-record predicate. Preserve sparse arrays,
recursive plain/null-prototype data copies, atomic object/function identity, own enumerable string
keys and failure propagation. Do not broaden accepted state or add cycle handling.

Make absent boolean event modifiers optional in the private parsed-event record. Existing truthy
checks retain their behavior; native listener registration and removal still receive explicit
boolean capture/passive options. Preserve every modifier name, key alias, delay default and
diagnostic. The combined source refactor and ticket 0033's function-hoisting build option measure
62,984 gzip bytes in an isolated core consumer, below the unchanged 63,000-byte limit. This is
planning evidence, not installed-package acceptance.

Planned files: `src/value-checks.ts`, `src/runtime.ts`, `src/declarative.ts`, `src/fetch.ts`,
`src/patch.ts`, `test/value-checks.test.ts`, `docs/ARCHITECTURE.md` and this ticket. Add direct
copy-isolation/atomic-identity coverage, run the existing application, request, patch and modifier
tests, then fast, coverage, actual package and complete delivery checks. All previous ownership
failures and pending acceptance remain recorded. No size allowance, public API or cleanup guarantee
changes.

### Scope

Coverage follow-up to the size refactor: `test/fetch.test.ts` must exercise nested pending/error
paths through a public backend action. Verify replacement of a non-record intermediate, creation of
a missing intermediate, preservation of existing sibling state, pending/error values during dispatch
and settlement afterward. The first coverage rerun reports uncovered changed line 91 in
`src/fetch.ts`; preserve that failure and add behavior coverage without changing runtime code or
thresholds.

- Stage application-owned effects, listeners, directives, requests, UI rules, and hooks before
  committing the instance.
- Roll back all staged work when setup fails.
- Remove cleanup records before invocation, continue after failures, and aggregate cleanup errors.
- Give effects an owner and contain one failing scheduled effect.
- Add an application-aware DOM patch transaction that destroys outgoing roots before mutation and
  initializes incoming roots after mutation.
- Define nested-root ordering and explicit preservation.
- Add a render-committed result or `whenEnhanced()` barrier without changing `nextUpdate()`.

### Out of scope

- Full page navigation or external Turbo/htmx bridges.
- Public plugin directives. Ticket 0009 consumes this lifecycle.

### Dependencies

- Ticket 0005.

### Acceptance criteria

- [x] [AC-01] Failed application initialization leaves no effect, listener, request, observer,
      jQuery data, UI mount, or application record.
- [x] [AC-02] Cleanup records are removed before invocation, run exactly once, continue after
      individual failures, and report one error or an aggregate after all cleanup is attempted.
- [x] [AC-03] One failing scheduled application effect does not skip later effects owned by the same
      or another application.
- [x] [AC-04] Inner outgoing application roots are destroyed before outer roots and before DOM
      removal.
- [x] [AC-05] Roots marked `data-jqs-preserve` remain mounted and are not enhanced twice.
- [x] [AC-06] Existing HTML responses and Datastar element patches use the same render transaction.
- [ ] [AC-07] `$.star.whenEnhanced()` resolves after MutationObserver delivery, directive setup, UI
      enhancement, and reactive flushing without changing `nextUpdate()` semantics.
- [x] [AC-08] Application destruction and kernel disposal release every kernel-owned resource in the
      ledger, including application observers.

- [ ] [AC-09] Re-enhancement binds current Password Field and Number Field parts and renders
      replaced Chart parts without duplicating unchanged behavior; temporary legacy clipboard
      controls are removed on success, refusal and thrown failure. Pending Code Block copy outcomes
      update current status parts after re-enhancement.

- [ ] [AC-10] Form-bound component listeners follow the current native form after re-enhancement,
      release the exact prior form binding after control replacement or form changes, and do not
      duplicate unchanged bindings or Search Field search events. Questionnaire releases exact
      bindings to replaced navigation and reset buttons.

- [ ] [AC-11] File Upload and Multi Select render current list/tag parts and current tag
      labels/disabled state after enhancement; replacing an active Multi Select controller releases
      its old floating content, active-set membership and search timer before binding the
      replacement.

- [ ] [AC-12] Pending native reset callbacks from replaced Rating, Color Picker and Time Picker
      controllers cannot overwrite the replacement after enhancement; live current-controller reset
      callbacks retain normal behavior.

- [ ] [AC-13] JSON Viewer and Log Viewer operate on current parts after enhancement; unchanged empty
      JSON sources stabilize, former Log Viewer native listeners are released, and pending follow
      work honors the current paused/following state.

### Design

Keep patch parsing and Idiomorph behavior separate from ownership orchestration. The transaction
owns before/commit/after phases and reports aggregated failures with operation IDs.

Application constructors stage effects, delegated listeners, UI-rule mounts, directive cleanups,
requests, and their owned observer. The jQuery plugin commits the application record and jQuery data
only after construction succeeds. A failed constructor rolls its staged resources back in reverse
ownership order and preserves the original setup error alongside any rollback failures.

The kernel maintains application lifecycle records and creates a render transaction for each
`patchElements()` call in its document. Idiomorph callbacks identify the exact outgoing and incoming
nodes. Direct patch modes call the same transaction hooks. Outgoing application roots are sorted by
DOM containment, deepest first, and destroyed before removal. Surviving owner applications clean the
outgoing subtree before mutation; their existing observers initialize inserted content afterward.
The document UI observer uses the same post-mutation delivery window.

`nextUpdate()` remains the reactive-queue primitive. The installed static gains
`$.star.whenEnhanced()`, which waits for every render transaction that was pending when called,
MutationObserver delivery, UI/directive work triggered by those records, and the resulting reactive
flush. The patch function remains synchronous and keeps its existing return type.

### Decisions

- Application observer records are kernel-owned and explicitly released by rollback or destruction;
  application-local jQuery handlers, effects, mounts, requests, and directives remain application
  records with deterministic cleanup.
- `data-jqs-preserve` is the explicit application-preservation marker. A marked subtree is excluded
  from morphing/removal and therefore retains its application and controller state. Existing
  `data-ignore-morph` behavior remains compatible but does not become an application contract.
- Direct replacement/removal of a target containing a preserved root is skipped because moving a
  preserved root to a different parent would silently change ownership.
- Render cleanup failures do not stop sibling cleanup or the requested DOM mutation. The synchronous
  patch call reports one original error or an `AggregateError` after commit, including the render
  operation ID in aggregate messages.
- Application observers remain the canonical directive and behavior enhancement mechanism. The
  render barrier waits for their delivery instead of running a competing second scanner that could
  execute `data-init` or mount hooks twice.
- Scheduled application effects report through the application's existing `jquery-star:error`
  channel. Unowned effect failures are retained and rejected by the next reactive barrier after all
  other scheduled effects have run.

### Security and accessibility

- Preservation is opt-in and scoped to an explicit DOM subtree; server markup cannot implicitly
  retain stale client state.
- Lifecycle work does not evaluate additional expressions or broaden HTML parsing. Existing patch
  target scoping and expression trust boundaries remain unchanged.
- UI enhancement completes before the render barrier, so ARIA state, keyboard behavior, focus
  restoration, and native-control wiring are observable when callers continue after the barrier.
- Cleanup failure aggregation must not strand document listeners, observers, focus handlers, request
  controllers, or later cleanup callbacks.

### Risks

- MutationObserver callbacks may race explicit mount work. Suspend or deduplicate enhancement during
  a transaction and prove ordering in browser tests.
- Preserving a root can retain stale server state. Preservation must be explicit and narrow.

### Verification plan

- Add failure-injection tests for every setup and cleanup phase.
- Add patch tests for nested roots, preservation, request cancellation, repeated enhancement, and
  render-barrier ordering.
- Run focused browser patch tests, `npm run check`, `npm run test:package`, and `git diff --check`.

### Planned files

- `src/errors.ts`: Shared deterministic cleanup/error aggregation helpers.
- `src/reactivity.ts`: Effect ownership, initial-run rollback, scheduled failure containment, and
  barrier-visible unowned failures.
- `src/kernel.ts`: Owned application observers, lifecycle records, render transactions, nested-root
  ordering, enhancement barriers, and operation IDs.
- `src/runtime.ts`, `src/declarative.ts`: Transactional construction, idempotent aggregated cleanup,
  owned effect errors, and subtree lifecycle hooks.
- `src/patch.ts`: Kernel-aware Idiomorph/direct-mode transaction hooks and explicit preservation.
- `src/types.ts`, `src/index.ts`: The public `whenEnhanced()` contract and any exported supporting
  type required by the final API shape.
- `test/{reactivity,kernel,runtime,declarative,patch}.test.ts`: Failure injection, exact-once
  cleanup, scheduler containment, nested roots, preservation, and barrier ordering.
- `test/fetch.test.ts`, `test/datastar-sdk.test.ts`: HTML and SDK event transaction integration.
- `e2e/quality-contracts.spec.ts`: Real-browser observer/UI/render-barrier proof where jsdom is not
  authoritative.
- `quality/public-baseline.json`, `etc/jquery-star.api.md`: Intentional public surface update.
- `vite.config.ts`, `package.json`, `package-lock.json`: Keep the expanded lifecycle runtime within
  the fixed production bundle budgets through the supported Vite minifier path.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP}.md`, `docs/README.md`: Public usage
  and durable lifecycle/ownership contracts.
- `docs/tickets/0006-make-lifecycle-transactional.md`: Live plan, changed-file ledger, commands, and
  acceptance evidence.

### Plan extension: behavior setup and detached mounts (2026-09-06)

Current source probes reproduce three failures through public behavior applications. Destroying an
application during its first binding leaves a subscribed effect and acquires an observer. Destroying
it inside a mount loses returned cleanup and allows a later mount and observer. Removing a mounted
node immediately before destruction skips its cleanup because the root no longer contains it. The
preserved before records are `ownership-census/behavior-registration-before.json` and
`ownership-census/behavior-detached-mount-before.json`; the source digest is
`8bf6f60b1f7101fcd701369ebc74b709d47092a4743d5026867809e1eeaca5ac`.

Stop an initial runner if its callback destroys the owner, stop subsequent rule/mount installation,
and skip observer acquisition after destruction. If a mount's provisional record is released while
the callback runs, invoke its returned cleanup immediately instead of retaining it in that removed
record. Root teardown releases every owned mount, including detached nodes; subtree cleanup retains
its containment and preservation rules. Preserve public callbacks, return types, destruction
idempotence and cleanup error propagation. A private prototype passes the three reproduced cases; it
is not maintained-code or package acceptance.

Planned files: `src/runtime.ts`, new `test/behavior-lifecycle.test.ts`, `README.md`,
`docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, this ticket, owner 0033 and the roadmap.
Regenerate affected agent content with its maintained generator. Update only the Mobile reference
UMD measurement from the rebuilt artifact if needed. Add public regression cases for initial
binding/model/event setup, initial and dynamic mounts, returned cleanup errors, released subtrees
and immediate node-removal followed by application or kernel destruction. Preserve failing tests
before applying the fix, then run focused, fast, exact changed-code coverage, installed-package,
browser, size/graph/API/type/reproducibility and full delivery checks. All budgets and mutation
deferral remain unchanged.

### Plan extension: detached declarative ownership (2026-09-06)

The full ownership review reproduces a separate declarative cleanup gap through public core APIs.
Removing a child before MutationObserver delivery and immediately destroying its application leaves
the child's registered cleanup uncalled. Its window listener can still change destroyed application
state. Kernel disposal also misses the cleanup and the remaining listener calls the disposed
expression engine. The exact current-source bundle, source identities, two-mode observations and
failing assertion are retained under `ownership-census/declarative-detached-*`.

Keep AC-02 and AC-08 pending and return to planned. Full root cleanup must visit every application
cleanup record, including elements detached before observer delivery. Cleanup of an ordinary subtree
must retain containment and preserved-root exclusions. Preserve record removal before invocation,
error aggregation, native listener removal, computed cleanup, effect disposal and repeated-destroy
behavior. This corrects application ownership and does not change the public directive API.

Planned files: `src/declarative.ts`, new `test/declarative-detached.test.ts`, `README.md`,
`docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`, this ticket, owner 0033 and
the roadmap. Add public regressions for application/kernel destruction with detached nodes, normal
and throwing cleanup, removed listeners/model bindings and unaffected live sibling subtrees. Retain
the unchanged-source failures before the implementation. Then run focused lifecycle/patch tests,
fast, current coverage, actual package budgets and complete delivery. Keep every existing size and
coverage requirement and mutation deferral. The preceding full run was stopped for this reproduced
defect and cannot provide a delivery receipt.

The actual corrected build changes the compatibility UMD from 463,255 to 463,263 bytes. Extend the
planned-file manifest to `quality/jquery-mobile-migration.json` and update only its existing jQuery
Star asset measurement from the built file. Preserve all migration decisions and size ceilings; this
is measured artifact metadata, not a budget change.

- [ ] [AC-14] Disclosure removes exact old summary listeners on part replacement. Editable uses
      current parts and native key bindings after enhancement, preserves committed/draft state
      during editing, and commits/cancels through current controls.

- [ ] [AC-15] Countdown re-enhancement uses current output/status parts and restores the shared
      clock for a still-running reinserted root without duplicate timers or restarting
      paused/completed countdowns.

- [ ] [AC-16] Tabs callbacks use current trigger values after enhancement and release obsolete
      bindings. Dialog's controller-generated labels reference current title/description parts while
      authored ARIA and one-time native event binding remain intact.

- [ ] [AC-17] Input OTP and Tags Input use current native/output/status parts after enhancement,
      release detached callbacks, preserve current value rules and render a replacement tags list
      even when it inherits a cached signature.

- [ ] [AC-18] Form validation, server errors, Field reflection and reset use the current native
      association roster, including external controls. Host-owned external event delegation follows
      current association, avoids duplicate local handling and releases on host disposal.

- [ ] [AC-19] Popover and Hover Card generated title associations track current parts after
      enhancement while preserving authored labels and existing open/listener behavior.

- [ ] [AC-20] Automatic Message Scroller callbacks respect current native unfollow and root
      connection while explicit latest/follow behavior and replacement cleanup remain intact.

- [ ] [AC-21] Feed article-generated title/description references track current parts after
      enhancement, preserving authored ARIA and the current application-owned HTML contract.

- [ ] [AC-22] Resizable re-enhancement uses current valid native parts, cancels replaced drag
      sessions and releases exact bindings. Window pointer listeners exist only during a session and
      release on completion/cancel, replacement or observed disconnection.

- [ ] [AC-23] Transfer List and Sortable distinguish every accepted string-array value, including
      separator characters, in public set and root-patched comparisons while preserving native
      output/events.

- [ ] [AC-24] Canceled Stepper transitions preserve completed state, and Menubar state/value remain
      consistent with child menus whose close was canceled, including after enhancement.
      Questionnaire retains submitted state after canceled navigation.

- [ ] [AC-25] Sortable retains an active preview only for unchanged list/item identities and rebinds
      current parts after replacement, with current values and inert detached callbacks.

- [ ] [AC-26] Nested Sortable controllers reconcile only their own generated hidden inputs,
      preserving independent native form submission and unchanged input identity.

- [ ] [AC-27] Generated popup/question label references follow current parts while different
      authored ARIA and native label fallbacks remain intact.
- [ ] [AC-28] Menu, Select and Combobox sibling closure affects only the owning document.
- [ ] [AC-29] Obsolete or canceled native reset work cannot write or notify replacement controls,
      changed form associations or superseded Questionnaire records. Questionnaire reset chooses an
      enabled current question when its original default is absent.
- [ ] [AC-30] New Combobox/Tree nodes receive distinct generated IDs after insertion without
      renaming unchanged or authored nodes.
- [ ] [AC-31] Date Picker/Range Picker bind and notify current native parts, and Calendar renders a
      replacement grid despite copied cache markers, preserving unchanged grid identity. Queued
      picker focus requires current control/Popover/calendar ownership and an open Popover.
- [ ] [AC-32] Disabled Tree items cannot activate and disabled Data Table rows are excluded from
      native bulk-selection operations and counts.
- [ ] [AC-33] Data Table preserves first-enhancement selection seeding and cross-page selected IDs
      without retaining every historical unselected row ID.

- [ ] [AC-34] Scoped resources release before render removal and on missing preservation, native
      removal and kernel disposal; cleanup errors do not skip later resources or leak boundaries.
- [ ] [AC-35] Disposed UI facades and actions cannot acquire work, including after reinstallation;
      root selection and disposal remain isolated by owning document.
- [ ] [AC-36] Every controller family owns its timers, observers, listeners, pointer sessions and
      deferred effects; preservation, native moves and documented re-enhancement state still work.
- [ ] [AC-37] Public lifecycle regressions, complete component/host conformance, fixed package
      budgets, unchanged coverage floors and current documentation verify the ownership correction.
- [x] [AC-38] Cancellation during staged plugin listener acquisition suppresses synchronous native
      delivery, stops canceled native setup, preserves completed duplicate/newer owners and error
      ordering, and releases all listener accounting without changing public host signatures.
- [ ] [AC-39] Data Table enhancement and page operations have bounded row-read and whole-root
      selector growth while still stopping stale work after synchronous source/part mutation and
      releasing transaction observers on completion and failure.

## Code

### September 23 Sortable native drag transaction boundaries

Changed-file ledger: `test/ui-sortable-document.test.ts` adds eight same- and foreign-Document cases
for native drag transactions. This ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and
PROGRAM_AUDIT record the plan, behavior and gate evidence. The existing trusted three-engine drag
case remains the browser control. No production source, public signature, fixed budget, threshold or
lint allowance changes were needed.

### September 23 external native floating state and refresh

Changed-file ledger: `test/ui-floating-resource-lifecycle.test.ts` adds five external native-toggle
cases and two lost-overlay refresh cases across the shared floating controllers.
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add one selected
actual-browser case for Popover and Hover Card native events in the three desktop engines. This
ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the contract and
evidence. No production source, public signature, budget, threshold or lint allowance changes.

### September 23 Form clear-errors and native Menu interaction boundary

Changed-file ledger: `test/ui-form.test.ts` proves a wrong-kind native input cannot clear its nearby
form's server validity and retains root, selector and implicit calls. `test/ui-menu.test.ts` checks
authored versus native disabled focus and external native popover state.
`test/ui-context-menu.test.ts` checks the ContextMenu key and cancellation of a pending touch press
by move, up and cancel. `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` extend the selected three-engine native browser case. This
ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the measured
behavior. No production source, signature, budget, threshold or lint allowance changes in this wave.

### September 23 structural explicit-action routing

Changed-file ledger: `src/ui/index.ts`, `src/ui/form.ts`, `src/ui/disclosure.ts`, `src/ui/menu.ts`
and `src/ui/toggle.ts` validate each explicit HTMLElement through the existing kind-aware resolver.
`etc/jquery-star-ui.api.md` refreshes only the generated warning line reference from 667 to 670.
Form `set-errors` and `clear-errors`, and Toggle `press`, classify a first native element as an
explicit target before their value overload. The six matching component test files add nine direct
negatives and matching, selector and implicit controls. `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` add the three-engine native-state case. This ticket, umbrella
0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the contract and evidence. Public
signatures, budgets, thresholds and lint allowances remain unchanged.

### September 23 additional explicit-action routing

Changed-file ledger: `src/ui/combobox.ts`, `src/ui/tabs.ts`, `src/ui/data-table.ts`,
`src/ui/chart.ts`, `src/ui/tooltip.ts`, `src/ui/carousel.ts`, `src/ui/hover-card.ts`,
`src/ui/select.ts`, `src/ui/popover.ts` and `src/ui/file-upload.ts` pass every explicit HTMLElement
to their existing root resolver before any implicit fallback. `src/ui/tree.ts` validates a native
root in its target/value actions; Carousel `go` and File Upload `remove` recognize the same
overload. The eleven matching component tests add ten wrong-kind negatives, three
matching-root/value probes and retained selector/implicit controls.
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add one selected
native-browser case for Combobox, Tree, Tabs, Carousel, File Upload and Popover across desktop
engines. This ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the
contract and evidence. Public signatures, budgets, thresholds and lint allowances remain unchanged.

### September 23 remaining explicit-action routing

Changed-file ledger: `src/ui/transfer-list.ts`, `src/ui/log-viewer.ts`, `src/ui/json-viewer.ts`,
`src/ui/pagination.ts`, `src/ui/message-scroller.ts` and `src/ui/countdown.ts` validate any explicit
HTMLElement through their existing target resolver. Message Scroller `follow` also recognizes a
matching native root as its target/value overload. Their six component test files hold the public
negatives and matching/selector/implicit controls. `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` add one selected real-browser case across all six families. This
ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the contract and
evidence. Public signatures, fixed budgets, thresholds and lint allowances remain unchanged.

### September 23 Color Picker and Editable target audit

Changed-file ledger: `src/ui/color-picker.ts` and `src/ui/editable.ts` validate every explicit
HTMLElement through their existing component resolver. `test/ui-color-picker.test.ts` and
`test/ui-editable.test.ts` add direct public negatives, matching/implicit controls and native color,
form, disabled-state, reentry, delegated event, validity and focus checks. The selected
native-action case in `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` covers both components in Chromium, Firefox and WebKit. This
ticket, umbrella 0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT document the contract and
evidence. Public facade signatures, fixed thresholds, package budgets and lint allowances remain
unchanged.

### September 23 Password Field and Sidebar target audit

Changed-file ledger: `src/ui/password-field.ts` and `src/ui/sidebar.ts` validate any explicit
HTMLElement through their existing component resolver, rejecting wrong-kind elements instead of
falling back to a nearby component. `test/ui-password-field.test.ts` and `test/ui-sidebar.test.ts`
add the public negatives and native state, reentry, replacement, backdrop, and storage recovery
controls. `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` extend the
selected three-engine native-action case to both components. This ticket, umbrella 0033,
COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT document the contract and evidence. Public facade
signatures, thresholds, package budgets and lint allowances remain unchanged.

### September 23 shared lifecycle and preserved-focus audit

Changed-file ledger: `test/scoped-observer-acquisition.test.ts` adds detached-Document, dual-failure
acquisition and reentrant reset-retirement cases against the exported UI lifecycle and an actual
document host. `test/ui-preserved-focus.test.ts` injects owner disposal during native focus-listener
registration and checks listener release and suppressed focus. This ticket, umbrella 0033, TESTING
and PROGRAM_AUDIT record the behavior and remaining coverage entries. No production source, public
contract, threshold, package budget or lint allowance changed.

### September 23 native value-action targets and coverage

Changed-file ledger: `src/ui/input-otp.ts`, `src/ui/search-field.ts`, `src/ui/tags-input.ts`,
`src/ui/stepper.ts` and `src/ui/multi-select.ts` resolve a first native root argument explicitly in
their target/value actions, including wrong-kind rejection through the existing resolver.
`test/ui-input-otp.test.ts`, `test/ui-search-field.test.ts`, `test/ui-tags-input.test.ts`,
`test/ui-stepper.test.ts` and `test/ui-multi-select.test.ts` add direct public negatives and
observable native value, form, cancellation, reentry, replacement, validation and clear controls.
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` extend the selected
three-engine native action case to these five families. This ticket, umbrella 0033,
COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT document the scope. Public method signatures,
coverage thresholds, package budgets and lint allowances are unchanged.

### September 23 native-control element actions and coverage

Changed-file ledger: `src/ui/number-field.ts`, `src/ui/time-picker.ts`, `src/ui/rating.ts`,
`src/ui/toggle.ts` and `src/ui/toolbar.ts` now treat a native root element as an explicit first
target in actions that also accept an implicit value/amount. Their resolvers reject an element of
the wrong component kind. `test/ui-number-field.test.ts`, `test/ui-time-picker.test.ts`,
`test/ui-rating.test.ts`, `test/ui-toggle.test.ts` and `test/ui-toolbar.test.ts` add public action,
native-event reentry, replacement, fallback and focus boundary cases.
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add one selected
cross-engine browser case for the six component forms and mismatched target. This ticket, umbrella
0033, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT carry the contract and evidence. No public
method signature, coverage threshold, package budget or lint allowance changes.

### September 23 changed-code coverage recovery

Changed-file ledger: `test/ui-clipboard-write-lifecycle.test.ts` exercises cancellation before
reading Clipboard, during its getter, during fallback control creation/append/selection and during
the legacy command lookup. `test/ui-floating-resource-lifecycle.test.ts` checks a replacement owner,
duplicate and stale claims, and a revision change during reconciliation.
`test/ui-pagination.test.ts` checks the named next/previous action with an actual element target.
This ticket, umbrella 0033, TESTING and PROGRAM_AUDIT record the coverage delta and remaining gate
failures. No production source, public API, threshold, package budget or allowance changed.

### September 23 plain nested-application ownership

Changed-file ledger: `src/declarative.ts` now scopes initial and mutation scans of a plain root to
its own `data-jqs` island and cancels requests only for elements that application claimed, including
after native detachment. Page-wide boot keeps its document scope.
`test/declarative-nested-application.test.ts` adds six public-core cases for both startup orders,
page-wide boot, late insertion and child attribute changes, native movement, preserved patch,
ordinary removal, outer destruction, unmarked nested signals and named component markers. The opt-in
`nested=1` host fixture/spec under owner 0016 exercises real backend traffic with an outer
application. ARCHITECTURE, RUNTIME_OWNERSHIP, BACKEND, INTEROPERABILITY, TESTING, PROGRAM_AUDIT and
tickets 0006/0016/0033/ 0036/0037 record the boundary. No public API, host range or fixed budget
changes.

### September 22 core document-retention extension

Changed-file ledger: `test/document-retention-browser.mjs` now exercises core-only idle, behavior
and declarative installations, staged plugin listeners, document listener acquisition/identity/
options and first observer acquisition through existing fixtures. The 39 core Documents join the 208
UI Documents in one exact 247-document collection assertion; each core exercise has a behavior
control. The core frame releases the installed kernel and frame in `finally`. This ticket, umbrella
0033, TESTING and PROGRAM_AUDIT document the expanded scope. Production source, package and public
API are unchanged.

### September 22 document-retention measurement implementation

Changed-file ledger: `test/document-retention-browser.mjs` is a standalone Chromium CDP probe that
reuses existing 50-family ownership fixtures. It checks 50 distinct family cases and 54 additional
modes for the nine families with module-level active-record Sets, captures 208 disposed source and
destination Documents by WeakRef, and verifies collection after at most twelve explicit GC cycles. A
weakly referenced detached control must collect and a held control must remain. It binds an
ephemeral loopback Vite server and closes browser/server in `finally`. TESTING, PROGRAM_AUDIT and
tickets 0006/0033 record the command and boundaries. No production, package script, browser
selection, fixed budget, lint allowance or public API change.

### September 22 Menubar selector implementation

Changed-file ledger: `src/ui/menubar.ts` resolves one-argument actions by local direct-child menu
value before Menubar selector, and reads two-argument actions as explicit target/value pairs.
`src/ui/lifecycle.ts` handles installed-facade strings at its owning-document guard, selecting the
first HTML Menubar after unrelated matches and normalizing invalid/missing targets. The new
`test/ui-menubar-selector.test.ts` proves all forms and foreign-document/child-Menu rejection. An
additional two-argument negative requires a real target even inside a local Menubar and normalizes
invalid selectors from the action path; `e2e/fixtures/ui-document-ownership.ts` and
`e2e/ui-document-ownership.spec.ts` prove native popup and focus behavior per engine.
COMPONENT_ARCHITECTURE, TESTING, PROGRAM_AUDIT and tickets 0006/0033 record the behavior, tests and
remaining audit scope. No public API, budget or lint allowance change.

### September 22 Data Table cost implementation

Changed-file ledger: `src/ui/data-table.ts` uses a transaction-scoped MutationObserver to flag
source/part changes. Each validity check still verifies record, revision, owner document, current
table and source settings; it rescans rows and controls when native mutations occur and latches a
failed check for the rest of that transaction. Both request and sync paths disconnect the observer
after work; observe failure disconnects provisional registration, and concurrent work/cleanup errors
retain both causes in order. `test/ui-data-table-cost.test.ts` records deterministic scaling,
whole-root query count, native pagination, synchronous row mutation/replacement and observer
cleanup/error ordering. The document browser fixture/spec add one real-engine cost and native-page
control per engine. This ticket, umbrella 0033, TESTING and PROGRAM_AUDIT carry the evidence and
open limits. No public API, budget, lint allowance or CSP inventory changes.

### September 22 staged plugin listener implementation

Changed-file ledger: `src/plugin.ts` passes a staged acquisition's active predicate through an
optional private callback while preserving the existing custom-host argument; `src/kernel.ts` checks
that predicate after native method/options reads and native add, suppresses canceled pending
callbacks and unwinds canceled setup without hiding real native errors. It checks ownership after
reading the native method and invokes it through `Reflect.apply`, so a canceled getter cannot leak a
`.bind` TypeError. New public suites `test/plugin-listener-cancellation.test.ts` and
`test/plugin-listener-cancellation-getters.test.ts` cover duplicate, replacement, getter,
setup/cleanup and resource-accounting behavior. The document browser fixture/spec add eleven
scenarios per engine. README, RUNTIME_OWNERSHIP, TESTING, PROGRAM_AUDIT and tickets 0006/0033 record
the contract, evidence and remaining scope. No public host signature, API baseline, lint allowance,
budget, exclusion or frozen CSP inventory was changed.

### September 21 document listener acquisition implementation

Changed-file ledger: this owner/umbrella 0033 carry the Plan and evidence; src/kernel.ts owns
listener acquisition and a weak native-identity index; test/document-listener-acquisition.test.ts
promotes and extends the public regressions; the document browser fixture/spec adds thirteen
scenarios per engine; README and ownership/testing/program docs describe verified behavior and
remaining scope. The index reuses completed identities, retires pending identities before newer
setup, captures native options once and removes only its own guarded callback. No public signature,
plugin source, API baseline, lint allowance, budget, exclusion or frozen CSP inventory changed.

A bounded review covers all 25 runtime host.listen call sites, including Form event/capture keys,
shared viewport handlers, DOMContentLoaded once and bridge release arrays. Source hashes/excerpts
and limitations are recorded in document-listener-caller-excerpts.json and caller-review.md under
the ignored September 19 audit directory. This does not count as full semantic review credit.

### Sortable implementation and native focus follow-up — September 21

Sortable now owns its installation document/window and current scoped parts through UIResources.
Snapshots guard native rendering, hidden inputs and notification chains. Implicit action values
beginning with # are resolved by arity; copied arrays preserve event/value identity. Unchanged
listeners and previews survive enhancement, patched order supersedes previews, cleanup sweeps
listener errors and avoids replacement/source state. Follow-ups preserve list-background drop, end
preview before button moves, validate duplicate patched values and retain keyboard focus when native
movement leaves the document body active. Native navigation keys are consumed only after grab.

Changed files extend the ledger below with src/ui/sortable.ts; both browser files (six modes each
and trusted adopted native pointer/HTML drag); README; COMPONENT_ARCHITECTURE, RUNTIME_OWNERSHIP,
TESTING, PROGRAM_AUDIT and umbrella ticket 0033. Public suites now contain 68 Resizable/82 Sortable
cases. Full current-input acceptance remains pending; no criterion or gate requirement is relaxed.

### Resizable/Sortable document continuation — September 21

Promoted the validated continuation Plan and 98 public regression cases before source changes.
Resizable now uses native owner documents/windows, current parts and guarded writes, copied event
arrays, intent ordering before caller iteration, owner storage and provisional pointer resources.
The private factory receives the installation Document from src/ui/index.ts. Added 24 follow-up
cases for reentrant storage/native writes, late capture, cleanup-error sweeps, immediate source/
part changes, anatomy, constraints, nested controls and stable labels/IDs. Corrected pointer setup
so its own preventDefault does not cancel acquisition; stale pointer delivery now releases the
session even when its old parts have changed. Sortable implementation is next. No acceptance
criteria are checked; no full-gate or browser acceptance applies to these current changes.

Changed files so far: this ticket (Plan and evidence), src/ui/resizable.ts (controller correction),
src/ui/index.ts (private owner argument), test/ui-resizable-document.test.ts (68 public cases), and
test/ui-sortable-document.test.ts (54 public cases awaiting implementation).

JSON Viewer and Log Viewer checkpoint (2026-09-19):

| Changed file                                                                                  | Purpose                                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/json-viewer.ts`                                                                       | Captured document/parts, retained native disclosure state, current render signature, guarded serialization/DOM work and constrained actions.            |
| `src/ui/log-viewer.ts`                                                                        | Captured document/parts, retained pause/follow, provisional listeners/scroll, callback ordering, current native filters and unique generated entry IDs. |
| `test/ui-viewer-document.test.ts`                                                             | 70 public ownership, action, native-state, serializer, callback and resource controls.                                                                  |
| `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`                  | 36 three-engine viewer cases with existing backend/SDK/accessibility controls.                                                                          |
| `quality/lint-boundaries.json`                                                                | Remove two obsolete type-parameter entries and reduce JSON's condition count from two to one; add no allowances.                                        |
| `README.md`, `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md` | Current rendering, native state, adoption, resource and callback contracts with executable evidence.                                                    |
| This ticket, `docs/PROGRAM_AUDIT.md`, `docs/tickets/0033-audit-full-library-program.md`       | Record the checkpoint and preserve the complete remaining audit scope.                                                                                  |

Clipboard and Code Block implementation checkpoint (2026-09-19):

| Changed file                                                                                  | Purpose                                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/copy.ts`                                                                              | Shared private document/task ownership, current parts, action target resolution, constraints, descriptions, adoption, provisional button/reset resources and cleanup. |
| `src/ui/clipboard.ts`, `src/ui/code-block.ts`                                                 | Preserve public APIs and named actions through the shared controller.                                                                                                 |
| `src/ui/clipboard-write.ts`                                                                   | Use owning-window native capabilities and guarded owning-document fallback with guaranteed temporary textarea cleanup.                                                |
| `test/ui-copy-document.test.ts`                                                               | 85 public controls for foreign documents, actions, metadata, constraints, ordering, adoption, fallback and interrupted resources.                                     |
| `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`                  | 66 native document/fallback/deadline cases across three engines; retain existing copy/form/accessibility controls.                                                    |
| `quality/lint-boundaries.json`                                                                | Remove seven obsolete exact allowances from the former copy implementations; add none.                                                                                |
| `README.md`, `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md` | Describe current copy parts, accepted task ownership, adoption, cleanup and executable evidence.                                                                      |
| `docs/PROGRAM_AUDIT.md`, `docs/tickets/0033-audit-full-library-program.md`, this ticket       | Record the checkpoint without closing the full family, host, semantic, budget or delivery requirements.                                                               |

Menu, Context Menu and Menubar implementation checkpoint (2026-09-19):

- `src/ui/menu.ts`: Captured resources, current document/direct parts/items/action binding, root
  intents and request revisions; retained focus, context point and absolute search/long-press
  deadlines. Both kinds join shared native ownership and deferred accepted completion. Sibling
  cancellation, selection/group changes, callback-time constraints and current geometry stop stale
  continuation. Native disabled items stay excluded; inactive ARIA/data items remain focusable.
- `src/ui/menubar.ts`, `src/ui/index.ts`: Parent ownership precedes acquisition. Destination
  acquisition refreshes independently owned child menus, preserving item focus. Current direct
  parts, retained roving value/search deadline and revisions guard child calls/focus. Parent close
  invalidates pending child openings and stops when callbacks choose a newer operation. Value
  reflection is idempotent. Nested/canceled events and native constraints are respected while
  inactive child items retain horizontal navigation.
- `src/ui/floating.ts`: Current-predicate point placement and removal of obsolete Menu record/show
  wrappers. Native content ownership now covers all five floating kinds.
- `test/ui-floating-document.test.ts`: 272 public ownership/continuation controls. Expanded cases
  cover Menu/Context Menu selection/parts/constraints/timers, all 20 directed native handoffs during
  opening/closing, and Menubar document/child/reentry/navigation/acquisition behavior.
- `test/ui-floating-resource-lifecycle.test.ts`: Include Date in the existing fake clock, keeping
  absolute-deadline interception and timer advancement deterministic.
- `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`: Six document
  ownership modes for each menu family, adoption deadline controls and the expanded native handoff
  matrix. Existing keyboard/accessibility controls remain included. Context Menu cleanup uses its
  native event after declarative action teardown.
- `quality/lint-boundaries.json`: Remove obsolete Menu/Menubar counts and reduce one Menubar count;
  the ratchet decreases from 298 to 295 exact entries across the same 341 files.
- Component, ownership, testing and audit guides plus tickets 0006/0033 record behavior and
  evidence. Full-family, actual-host, fixed-budget, semantic and delivery requirements remain open.

The preceding Hover Card checkpoint follows.

Hover Card and shared native ownership implementation checkpoint (2026-09-19):

- `src/ui/floating.ts`: Weak content-owner records, native-call exclusion and deferred
  revision-bound completion callbacks reconcile handoff between Popover, Tooltip and Hover Card.
  Cleanup retires old owners and pending work without removing a replacement claim.
- `src/ui/popover.ts`, `src/ui/tooltip.ts`: Adopt that shared boundary; actual native acceptance
  precedes placement, focus and lifecycle notifications, including reentrant controller handoff.
- `src/ui/hover-card.ts`: Captured resources/current document and parts, provisional acquisition,
  retained interaction deadlines and content focus, scoped titles, live constraints, native
  reconciliation and revision-bound dismissal focus suppression. A queued departure cannot erase
  open state while a formerly connected preserved root is detached.
- `test/ui-floating-document.test.ts`: Public Hover Card document/delay/focus/title/cleanup cases,
  cross-kind native handoff and notification controls, recovery reentry, preserved-detachment and
  explicitly detached activation regressions.
- `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`: Six Hover Card
  ownership modes, four deadline/disposal cases and all six directed handoffs between the three
  controllers during both native opening and closing. Existing composed-surface behavior and
  accessibility tests remain unchanged.
- Component, ownership and testing guides, tickets 0006/0033 and PROGRAM_AUDIT record this behavior,
  evidence and remaining scope. No public API, lint allowance or fixed ceiling is increased.

The preceding Tooltip checkpoint follows.

Tooltip implementation checkpoint (2026-09-19): captured resources and native document identities
replace the mutable listener array and ambient constructor checks. Exact parts identify current
ownership; weak snapshots retain open/pointer/focus state and pending absolute deadlines across
adoption. Timer identities invalidate canceled callbacks and provisional cleanup releases late
handles. Root intent and record revisions protect newer no-op requests, listener/timer setup and
cleanup, native methods, events and geometry. Native acceptance/toggle state is read directly. The
controller preserves noninteractive content, no focus movement and silent ordinary disposal.

- `src/ui/popover.ts`: Reads settled native state before API operations, so an immediate close after
  an authored native show works before toggle delivery. In-flight newer no-op requests still
  supersede older native work. Tooltip uses the same boundary.
- `src/ui/tooltip.ts`: Current document/parts, native transitions, owned delayed interaction,
  retained deadlines and authored/generated description ownership, including ID changes and reentry.
- `test/ui-floating-document.test.ts`: Adds 40 Tooltip cases to the existing four and one Popover
  follow-up. All 44 Tooltip and 39 Popover cases pass; 16 other-family cases remain failing.
- `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`: Six native Tooltip
  ownership modes and four deadline/adoption/disposal combinations in each of three engines.
- Component, ownership and testing guides plus this ticket, 0033 and PROGRAM_AUDIT record behavior,
  verification and remaining scope. Existing lifecycle/floating helpers and public signatures stay
  unchanged. No lint allowance or fixed budget is increased.

Popover implementation checkpoint (2026-09-19): ownership precedes listener acquisition and captures
document, direct parts and declarative click handling. Weak snapshots retain open state/focus across
adoption; ordinary disposal stays closed and silent. Root intent and record revisions stop older
work after newer requests, native methods, events, geometry and focus. Actual native state governs
acceptance and late toggle delivery; interrupted native calls reconcile with the current content
owner. Preserved native panels reopen during enhancement. The kernel retries ineffective preserved
focus after enhancement without overriding newer focus, newer renders or deliberate blur.

- `src/ui/popover.ts`: Captured resources, native brands/events, stable/adopted state, current
  parts, scoped generated titles, native acceptance/reconciliation and guarded continuation/cleanup.
- `src/kernel.ts`: One guarded focus retry after enhancement, transient focus observation and
  acquisition-failure cleanup, with errors reported through the existing render barrier.
- `test/ui-floating-document.test.ts`: Promotes all 24 floating discovery failures and extends
  Popover to 38 passing cases; 20 other-family cases remain failing in this 58-case public suite.
- `test/ui-preserved-focus.test.ts`: Nine generic readiness, ownership, blur and error cases.
- `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`: Six Popover modes
  across three engines, with actual native transitions, adoption, actions and preservation.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`: Current Popover
  and preserved-focus contracts, resource lifetimes and evidence limits.
- This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/PROGRAM_AUDIT.md`: Record
  failures, corrections, verification and remaining full scope. Shared floating/lifecycle helpers,
  public signatures, fixed budgets and lint allowances are unchanged by this checkpoint.

Transfer List implementation checkpoint (2026-09-19): resources are owned before native acquisition.
Exact parts/forms/document and operation snapshots guard current native membership, values,
highlights/defaults, constraints and generated fields. A weak reflected value separates explicit
root patches from silent native membership. Root intent spans cleanup/acquisition, and revisions
stop no-op, component/native event and queued reset continuations. Stable enhancement/adoption
retain native options and fields. Reset follows both native form owners and retains membership.
Authored/generated disabling, copied event arrays and nested/native controls stay distinct. Existing
shared helpers suffice; no public API or budget change.

- `src/ui/transfer-list.ts`: Captured resources/document/forms/parts, native authority, stable
  fields/highlights/defaults, owned reset, protected constraints/events and callback continuations.
  Styling-only native buttons remain owned parts while nested controllers remain separate.
- `src/ui/lifecycle.ts`: Deletes the unreferenced internal `listenToFormReset` helper after its
  final caller moves to `listenUIReset`; the existing owned reset helper remains unchanged.
- `test/ui-color-file-tree-transfer-document.test.ts`: Adds 63 Transfer List regressions to the
  existing group. All 231 cases pass, including all 67 Transfer List cases.
- `e2e/fixtures/ui-document-ownership.ts`, `e2e/ui-document-ownership.spec.ts`: Six Transfer List
  modes in three engines prove actual FormData/reset/defaults, adoption, native option/Enter/SVG
  interaction, private actions, current parts, cancellation, preservation and resource retirement.
  Transfer List buttons use the same styling markers as the source registry.
- `quality/lint-boundaries.json`: Removes Transfer List's allowance for thirteen non-null
  assertions.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`: Document native
  membership versus highlights/reset, disabled submission, ownership and evidence scope.
- This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/PROGRAM_AUDIT.md`: Keep
  implementation/command evidence, failure history and the complete remaining program scope.

Tree implementation checkpoint (2026-09-19): resource ownership precedes native registration. Exact
parts, hierarchy and document identify a current record. Stable enhancement retains bindings, active
exploration and query expiry; weak snapshots survive adoption and source disposal. Root intent spans
facade acquisition, while revisions and live DOM signatures stop stale callback, selection,
expansion, typeahead and focus work. Existing generated-attribute helpers preserve names and
authored disabling. Nested native interaction, composition and enabled-visible selection remain
compatible. No shared helper, public API, lint exception or budget changes were needed.

- `src/ui/tree.ts`: Captured resources/parts/document, retained exploration, provisional cleanup,
  owning-window events, current values/constraints and guarded operation continuations.
- `test/ui-color-file-tree-transfer-document.test.ts`: Adds 55 Tree cases to the existing group; all
  59 Tree cases pass. The 168-case group still fails its four Transfer List ownership cases.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Six Tree modes
  across three engines cover native focus/typeahead, expiry, private actions, replacement labels,
  cancellation, newer work, generated disabling, preserved values and resource retirement.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`: Document the
  Tree lifetime contract and the public/controller/browser evidence boundaries.
- This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/PROGRAM_AUDIT.md`: Keep
  exact command history, implementation evidence and the complete remaining audit scope.

File Upload implementation checkpoint (2026-09-19): the captured resource record owns exact parts,
form and document identity before listener acquisition. Native File identity governs selection;
metadata and row identity only govern rendering reuse. Facades reacquire current parts and stop
after cleanup disposal. Weak retained state preserves drag depth and rows through adoption, while
stale errors cannot outlive a native selection replacement. Reset microtasks honor revision and late
cancellation. Scoped event handling, live constraints, cloned event arrays and guarded native
DataTransfer writes prevent stale selection, cleanup and notification continuations. No shared
helper or public API change is needed. Tree and Transfer List remain under the same group Plan.

- `src/ui/file-upload.ts`: Captured document/form/parts/resources, File identity, rendering reuse,
  callback revisions, native writes, scoped drop/removal, unavailable state and reset ownership.
- `test/ui-color-file-tree-transfer-document.test.ts`: Adds 47 File Upload cases to the existing
  group; its 113 cases include 51 passing File Upload, 54 passing Color Picker and eight failures in
  Tree/Transfer List. Fixture corrections and all negatives remain recorded.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Six File Upload
  modes in three engines prove actual FileList, file contents in FormData, native resets and
  removal/clearing, drop validation, actions, adoption, preserved state and resource retirement.
- `quality/lint-boundaries.json`: Removes the three-condition File Upload allowance.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md`: Explain
  native File authority and evidence boundaries. Also restore the Multi Select heading and move the
  previously misplaced Color Picker paragraph beside its own contract.
- This ticket, `docs/tickets/0033-audit-full-library-program.md` and `docs/PROGRAM_AUDIT.md`: Keep
  Plan, implementation/command ledgers, historical reports and the complete audit scope.

Color Picker implementation checkpoint (2026-09-19): captured document, native/text/preview/status
and form identity replace stale records at enhancement or facade use. Weak native-text state
preserves drafts, selection/composition and invalid state. Exact native event identity and operation
revisions prevent stale callbacks, rollback, root patch overwrite and resumed acquisition after
cleanup disposal. Existing shared resource/reset helpers own setup and complete cleanup. Color
normalization uses the owning native input and browser CSS parser; CSS-wide/context-dependent values
cannot become the native black fallback. Implicit hexadecimal action values work alongside explicit
targets. The remaining three controllers stay under the same four-family Plan.

- `src/ui/color-picker.ts`: Implements the captured record, retained text state, revisions, native
  parsing, action arguments, unavailable controls, scoped swatches and provisional resources.
- `test/ui-color-file-tree-transfer-document.test.ts`: Promotes and expands public negatives to 66
  cases; 54 Color Picker and one File Upload control pass, eleven other-family cases still fail.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Add six Color
  Picker modes in three engines, including native color parsing, defaults/FormData, draft state,
  composition, actions, cancellation, adoption, preservation and removal.
- `quality/lint-boundaries.json`: Removes the now-unused Color Picker condition allowance.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md`: Document
  Color Picker behavior, resource ownership, native browser proof and remaining failing cases.
- This ticket, `docs/tickets/0033-audit-full-library-program.md` and `docs/PROGRAM_AUDIT.md`:
  Preserve Plan, changed-file/command ledgers, failures, historical fast proof and complete scope.

Multi Select implementation checkpoint (2026-09-19): the controller now captures native
control/form/label, document/window, popup/tag/status parts and generated option identity. Weak
reflected JSON preserves native edits; generated-node caches retain stable options/tags. Adoption
retains active exploration and the remaining typeahead interval. Native part replacement closes the
former popup. Provisional listener/reset/typeahead acquisition and complete cleanup protect newer
ownership, including cleanup reentry. Native events use captured constructors and exact synthetic
event identity; operation/document revisions stop older callbacks and current constraints guard
commit notifications. Disabled preselected choices remain locked during UI/API changes while native
writes/root JSON remain authoritative. Generated labels, empty option groups, native keyboard
targets, max/select-all, required validity, popup completion and guarded geometry retain their
contracts.

Changed-file ledger for this checkpoint:

- `src/ui/multi-select.ts`: Captured document/current parts, native/retained selection, exact
  generated nodes, provisional resources, full cleanup and callback/popup/geometry continuations.
- `test/ui-choice-time-document.test.ts`: Adds 74 cases to the prior 166, producing 240 public
  passing cases: 78 Multi Select, 70 Combobox, 53 Select and 39 Time Picker.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Add 18 Multi
  Select executions across six acquisition modes and three engines, including native FormData,
  required/max constraints, disabled selection, tags, focus, preservation and disposal.
- `quality/lint-boundaries.json`: Removes Multi Select's one non-null assertion allowance and
  reduces its unnecessary-condition count from three to one. No exception is added or increased.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`, this ticket,
  ticket 0033 and `docs/PROGRAM_AUDIT.md`: Record the implemented contract, evidence and limits. The
  next four-family discovery probe remains ignored evidence until its public promotion.

Combobox implementation checkpoint (2026-09-19): `src/ui/combobox.ts` now captures document/window,
query/hidden inputs and forms, exact options/content and inline mode. Stable enhancement retains
listeners, drafts, text selection, composition and active exploration. Native input identities
retain original reset defaults across adoption and source disposal. Exact synthetic-event identity
and operation/document revisions prevent older callbacks from overwriting newer values or popup
intent. Selection checks current parts, options and native constraints. Provisional listeners/reset
timers, complete cleanup, outgoing popup mode and geometry continuations survive disposal and
reentry. Preserved native popovers retain visibility/exploration, and canceled native opening stays
closed.

Changed-file ledger for this checkpoint:

- `src/ui/combobox.ts`: Captured ownership, retained input/default/query state, native event
  construction, callback revisions, complete resource cleanup and popup/geometry reconciliation.
- `test/ui-choice-time-document.test.ts`: Adds 66 cases, taking the public suite from 100 to 166.
  All 70 Combobox, 53 Select and 39 Time Picker cases pass; four Multi Select cases remain failing.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Add 18 Combobox
  executions across six acquisition modes and three engines, including draft/composition/default
  retention, native popovers, preservation, inline transition and resource removal.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`, this ticket,
  ticket 0033 and `docs/PROGRAM_AUDIT.md`: Update the implemented contract, test evidence and
  limits. No shared-helper, lint allowance, public signature or budget change is introduced by this
  checkpoint.

Select implementation checkpoint (2026-09-19): `src/ui/select.ts` now captures document/window,
native control/form/label, generated options and exact popup parts. Facades reacquire stale records;
unchanged enhancement retains native bindings, active exploration and typeahead. Provisional
listeners/timers and complete cleanup survive failures and reentry. Native events use the owning
window. Operation/document revisions preserve newer value and sibling-popup requests, and current
constraints stop stale commits. Native popup completion, preserved movement and cancellation stay
consistent with runtime state. Cleanup-continuation guards prevent new work after disposal.

Changed-file ledger for this checkpoint:

- `src/ui/select.ts`: Document/resource ownership, generated-node and native-state retention,
  callback revisions, provisional cleanup, popup preservation/cancellation, reset and typeahead.
- `src/ui/floating.ts`: Optional continuation guard prevents Select geometry writes after a
  measurement callback retires or supersedes its record. Other callers retain their prior contract.
- `test/ui-choice-time-document.test.ts`: Adds 49 Select cases to the preceding 51-case suite. The
  resulting 100 include 53 Select and 39 Time Picker cases, plus eight open Combobox/Multi Select
  cases. The full suite does not omit or weaken those failures.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Add 18 Select
  executions, including real native popover cancellation/preservation, option groups, keyboard
  exploration, forms and adoption with source disposal before/after destination acquisition.
- Component/ownership/testing guides, tickets `0006`/`0033` and `docs/PROGRAM_AUDIT.md`: Record the
  implemented Select contract, exact failures and verification limits. No lint allowance, public
  signature, fixed budget or acceptance criterion changes.

Time Picker implementation checkpoint (2026-09-19): `src/ui/time-picker.ts` uses native DOM
identity, captured resources, immediate destination reacquisition and owned form-reset work.
Listeners are registered provisionally and fully swept after failures. Current control/button/form
identity and operation revisions stop stale transitions. Weak last-reflected values preserve native
edits across source disposal/adoption; cloned native step probes leave the live input untouched.
Explicit context selectors can name the application root itself. No shared helper changes were
needed. Select, Combobox and Multi Select remain under the same active four-family Plan.

Changed-file ledger for this checkpoint:

- `src/ui/time-picker.ts`: Document/resource ownership, native state retention, constraints,
  callback ordering, nested presets, inherited fieldset disabling and reset lifetime.
- `test/ui-choice-time-document.test.ts`: 51 public cases, including the original four-family
  document failures and expanded Time Picker regressions. Twelve failures remain in the other three
  families; none are skipped or weakened in the full suite.
- `e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts`: Eighteen real
  Time Picker executions across three engines, with frame actions, native forms, adoption before or
  after source disposal, facade acquisition, preservation and removal.
- `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md`: Describe Time
  Picker's implemented contract and distinguish targeted passes from the open group failures.
- Tickets `0006`/`0033` and `docs/PROGRAM_AUDIT.md`: Record the partial implementation, commands,
  negative evidence and stale prior fast report. No acceptance criterion is newly closed.

The complete UI resource lifetime extension is in progress. `src/kernel.ts` now supports scoped
resources, transaction removal barriers, missing-preservation cleanup and native-removal cleanup;
`src/plugin.ts` forwards the scope and availability capability through staged installation.
`test/scoped-resource-lifecycle.test.ts` retains the original nine failures/one passing control in
`quality-refresh-2026-09-17/scoped-resource-before.log`. The first kernel/plugin/render regression
run passes 162 cases in seven files (`scoped-resource-first.log`). Three additional cases cover
preserved-child acquisition, native cleanup failure/reentry and removal during barrier settlement.
Type checking passes; initial focused lint rejects four non-null assertions in the new fixture,
which are replaced with explicit fixture validation before the next run.

`src/ui/lifecycle.ts` introduces transactionally activated UI ownership, retained-facade guards and
filtered enumeration. `src/ui/index.ts` connects the helper. Carousel and Message Scroller register
their listener/timer/observer cleanup, while Countdown owns per-document scheduling and preserves
its weakly retained deadline across cleanup. These changes are under focused verification. AC-34
through AC-37 remain unchecked: the other controller families, complete host matrix, package
budgets, coverage and current delivery evidence are still required. The preceding full delivery is
historical evidence and does not cover this implementation.

Current integration evidence and corrections:

- Corrected Toast fast `2026-09-19T15-03-40-708Z-57525` passes all six gates and all 2,662 units
  with no pending cases on unchanged 893-file fingerprint
  `36bfc06f85e79367d21e3a62df7ba9ac356b62850bb5a6656e65c6ca2ed613c7`. Report SHA-256:
  `450bb349bb84abb1a17af1fd7439df47d916e006a264906386641167205b0768`. `ui-toast-fast-corrected.log`
  records exit zero; `ui-toast-runtime-current.log` passes 72 focused runtime/Toast cases after the
  exact inventory correction. The final static gate covers all source, test and guidance changes.
  Subsequent edits to this ticket, ticket 0033 and PROGRAM_AUDIT record results only. Plan
  validation passes; actual Code/Test closure remains pending for Calendar/picker enrollment,
  cross-cutting ownership review, fixed budgets, host conformance and current full delivery. Prior
  build/API/bundle measurements predate Questionnaire and Toast and grant no current delivery
  acceptance.

- Initial Toast fast `2026-09-19T15-00-50-628Z-43086` passes five gates, including static, and fails
  one of 2,662 units. `test/runtime.test.ts` still expects `ui:toast:active-records` and two
  document observers. The source now installs `ui:toast:lifetime` and relies on kernel removal, so
  update the exact service list and observer count rather than retaining a redundant observer.
  Start/end fingerprints match. The other 2,661 units pass; corrected focused and fast evidence
  follows. Keep `ui-toast-fast.log` and its report as failure history.
- Toast adds scoped enrollment of the 46th family. `src/ui/toast.ts` owns captured root/close/action
  listeners, timer revisions, swipe capture, active-set membership and weak remaining-duration
  state. Announcements have viewport ownership and survive ordinary dismissal for their ten-second
  lifetime; live-toast, viewport or kernel cleanup releases them. Dismissal revisions and the
  original installation lifetime stop stale callbacks through removal/focus. Show/target resolution
  captures the installation document; outgoing/foreign targets and F8 are filtered. Creation rolls
  back partial markup, and overlapping pause causes cannot restart a timer prematurely.
- `test/ui-toast-resource-lifecycle.test.ts` adds 42 public cases. The initial probe records 17
  failures/six controls (`ui-toast-negative.log`), including a preservation fixture that incorrectly
  expires the promised root before committing. The first implementation passes 58 of 59 selected
  cases (`ui-toast-first.log`); committing that fixture before expiry corrects its remaining
  failure. Added acquisition cases expose an announcement appended during disposal plus two fixture
  errors (`ui-toast-acquisition-negative.log`, 31 controls). The fixture now expects repeated
  disposal to retain its failure and tests foreign show after its realm lease ends. The overlapping
  local-facade call failed in the shared realm target guard and remains in cross-cutting review; the
  replacement probe establishes captured foreign show after its lease ends. Focused verification
  passes 70 cases in four files (`ui-toast-current.log`).
- Four subsequent rollback/swipe probes fail (`ui-toast-rollback-negative.log`, 34 controls):
  generated markup after append failure/disposal, canceled swipe timing and a different pointer's
  cancellation. Their corrections pass 74 focused cases (`ui-toast-focused-final.log`). Four more
  cases expose outgoing-body creation, combined window/visibility pauses and pointer entry during
  timer setup (`ui-toast-pause-negative.log`, 38 controls). All corrections pass 1,226 cases in 82
  UI/kernel/bridge files (`ui-toast-integration.log`). Typed checks and focused lint pass
  (`ui-toast-types-final.log`, `ui-toast-lint-final.log`). The initial immutable ratchet rejects
  eight unnecessary conditions against four recorded; non-null text access and explicit mutable
  announcement lifetime remove the excess. Final ratchet passes 326 TypeScript files/303 exact
  file-rule counts (`ui-toast-ratchet-final.log`), with no allowance change. Fast verification
  follows.

- Questionnaire fast `2026-09-19T14-45-23-815Z-25584` passes all six gates and all 2,620 unit cases
  with no pending cases. Start/end fingerprints match across 892 files:
  `fec3d1289ad0a01ead2b28d2f6085a0f18bca277c71910f3c7af1fbeeb0779d4`. Report SHA-256:
  `f9160d2a97c32444a249e41ffccf47abb1476ab5a6ba554eb0d78f4bf583005b`. `ui-questionnaire-fast.log`
  records exit zero. Final focused checks pass 81 tests in five files, including all 34 new
  Questionnaire cases (`ui-questionnaire-focused-final.log`); the immutable lint ratchet passes 325
  TypeScript files and 303 exact file/rule counts (`ui-questionnaire-ratchet.log`). Final static
  analysis covers the last cleanup-reentry test. Subsequent edits to this ticket, ticket 0033 and
  PROGRAM_AUDIT record these results only. Plan validation passes; actual Code/Test closure remains
  pending for the complete lifetime scope. The preceding bundle/API measurements are historical
  after the Questionnaire source change.
- Questionnaire adds the 45th enrolled family. Its scoped record owns captured root/button/form
  listeners and reset timers, retains unchanged bindings, preserves default/submitted state in a
  separate weak cache and rejects stale callback continuations. Listener setup captures cleanup
  before registration; teardown attempts all removals, preserves setup/cleanup errors and keeps a
  newer record created during removal. Native invalid/focus/scroll, input/change and submit paths
  stop after disposal or a newer transition. Form reassociation retires old resets. The owning
  window supplies fieldset detection and reset scheduling; skip controls use the owning document.
- Logs under `quality-refresh-2026-09-19/` retain the initial 20 failures/four controls in
  `ui-questionnaire-negative.log`. The first correction passes 70 of 71 focused cases; the remaining
  fixture failure dereferences the removed `.star` property after disposal. Capturing that facade
  and using the supplied realm type corrects the fixture (`ui-questionnaire-current.log`, 24 pass).
  Added probes expose two more failures: replacement status initialization and disposal during timer
  scheduling (`ui-questionnaire-reentry-negative.log`, 31 controls). Fixing those passes 1,183 cases
  across 81 UI/kernel/bridge files (`ui-questionnaire-integration.log`). The next probe exposes
  duplicate ownership from enhancement during listener cleanup
  (`ui-questionnaire-cleanup-reentry-negative.log`, 33 controls); the correction keeps the newer
  record. Focused type/lint pass after correcting the fixture's Node-versus-DOM timer overload; the
  earlier diagnostics remain in `ui-questionnaire-types*.log`. Final fast evidence is above.

- Final data-cohort fast `2026-09-19T14-35-11-205Z-9257` passes all six gates and all 2,586 units
  with no pending cases on unchanged 891-file fingerprint
  `9eacf22282565a1980362015c2923112c21f0121deec10e0c63f3741ffe191be`. Report SHA-256 is
  `17af5ff6de75dd7a473151a5d4235a2aa6f5c407073a7bacc25437c80edabc79`; `ui-data-fast.log` records
  exit zero. Final static analysis covers the two additional retained-state tests as well as all
  source/API changes. Subsequent edits to this ticket, ticket 0033 and PROGRAM_AUDIT only record
  results. Calendar and its pickers, Questionnaire, Toast, cross-cutting ownership review, fixed
  budgets, complete host conformance and current full delivery remain required. Code closure and
  AC-34 through AC-37 remain open.
- Two final public state cases retain original row order and a filter without a native input after
  cleanup/reacquisition; all 30 data-resource cases pass (`ui-data-state-current.log`). These follow
  the 1,148-case integration below. Final focused lint and the immutable lint ratchet pass
  (`ui-data-lint-current.log`, `ui-data-lint-boundaries.log`: 324 TypeScript files, 303 exact
  file/rule counts). Both distribution builds and sequential API generation pass. Fresh
  `ui-data-preview-consumers/measurements.json` records core 193,517 raw/63,117 gzip, CSP 150,702
  raw/44,820 gzip/39,352 Brotli, root 550,344 raw, and stores 205,315 raw/66,491 gzip. Fixed limits
  are exceeded by 117 bytes for core gzip, 352 for CSP Brotli, and 7,624 for root raw. UI ESM is
  325,947 (7,483 over), UI CommonJS 324,749 (6,285 over), and root UMD 472,685 (7,789 over). Stores
  gzip has 69 bytes of headroom; all CSP graph exclusions pass. These source-bound previews do not
  substitute for installed-package acceptance or full delivery.
- The September 19 cohort adds Chart and Data Table, bringing scoped enrollment to 44 families.
  `src/ui/chart.ts` owns its logical record, rejects retired/superseded render continuations, and
  creates SVG/legend nodes in the owning document. `src/ui/data-table.ts` owns captured listeners,
  rejects stale sort continuation/rollback, preserves weakly keyed selection/order/filter state for
  reacquisition, and checks native tables with their owning window's constructor. Listener setup
  captures removal before acquisition, stops after disposal, and releases failed scopes; cleanup
  attempts every removal and preserves setup/cleanup errors. The component, ownership and testing
  guides document the behavior. `test/ui-data-resource-lifecycle.test.ts` adds 30 public cases.
- `quality-refresh-2026-09-19/ui-data-resources-negative.log` records 15 failures/eight controls.
  First correction passes 63 cases in five files. Acquisition/realm additions expose two listener
  setup failures and two fixture constructor errors (`ui-data-acquisition-negative.log`). Setup
  cleanup fixes those two failures; `ui-data-current.log` retains the constructor errors and one
  deferred fixture error from a persistent throwing registration stub. Use a one-shot stub and the
  fixture's own table/cell/SVG constructors. The corrected fixture then exposes Data Table's actual
  ambient-constructor bug (`ui-data-realm-negative.log`); fixing that passes 67 cases in five files.
  The final cleanup probe exposes an incomplete removal sweep (`ui-data-cleanup-negative.log`).
  After correction, `ui-data-integration.log` passes all 1,148 selected cases in 80 files, including
  the complete 28-case new suite. Type checking passes. Typed lint requires the AggregateError cause
  to reference the current cleanup error; both original errors remain in its error array. Final
  lint/fast/build evidence follows. Plan validation passes (`ui-data-plan.log`).
- Collection fast `2026-09-17T18-00-59-196Z-2189` passes all six gates and all 2,556 units with no
  pending cases on unchanged 890-file fingerprint
  `6a4c46b9dc30be7331de277139fb8f1d7d53e2a0bae9622b886a1e8965d0c5e9`. Report SHA-256 is
  `89d129434a9cbe0c5feaa95ad25133bb166a12901b1f9175fc40d9db77aee66f`. Sequential API generation
  passes (`ui-collection-api-final.log`), as do both final distribution builds
  (`ui-collection-build-final.log`). All 119 measured TypeScript input hashes match the source in
  `ui-collection-preview-consumers/measurements.json`: core 193,517 raw/63,117 gzip, CSP 150,702
  raw/44,820 gzip/39,352 Brotli, root 550,012 raw, stores 205,315 raw/66,491 gzip. Fixed limits are
  exceeded by 117 bytes for core gzip, 352 for CSP Brotli and 7,292 for root raw. UI ESM is 325,612
  (7,148 over), UI CommonJS 324,429 (5,965 over), and root UMD 472,360 (7,464 over). Stores gzip has
  69 bytes of headroom; source, ESM and CommonJS CSP graph exclusions pass. These previews do not
  prove installed-package acceptance. Remaining families, budget reduction and full delivery still
  prevent Code closure and AC-34 through AC-37 acceptance.
- Collection integration passes 1,104 cases in 78 files (`ui-collection-integration.log`). The
  command misspelled the external-render filename; the actual
  `test/external-render-contract.test.ts` then passes all 16 cases separately
  (`ui-collection-external-render.log`), for 1,120 executed cases in 79 files. No missing selector
  counts as executed evidence. An overlapping Vite build removed declaration inputs while API
  Extractor was running; `ui-collection-api.log` retains the failed htmx declaration lookup. Both
  processes are terminal before rebuilding declarations sequentially after the distribution builds.
  The corrected API result is recorded separately.
- The collection cohort enrolls Tree, Transfer List and Feed, bringing the total to 42 families.
  `src/ui/tree.ts` owns captured rows/items and typeahead, retains current search across unchanged
  enhancement/moves, and stops selection/expansion/focus after retirement. `src/ui/transfer-list.ts`
  owns native/button bindings, rebinds changed button operations, creates hidden inputs in the
  owning document, and stops native/component event chains after disposal or replacement.
  `src/ui/feed.ts` owns listeners, pending focus and its owning-window observer. Observer revisions
  reject stale delivery and interrupted/reentrant replacement; provisional observers are released.
  `test/ui-collection-resource-lifecycle.test.ts` adds 54 public cases. Component, ownership and
  testing guidance describe these lifetimes; the testing guide also records the prior choice suite.
- `ui-collection-resources-negative.log` records 23 failures/five controls before source edits.
  Initial correction passes 53 with three timer-fixture failures: select Tree's 500 ms timer, not
  the final unrelated scheduled timer. The corrected 28 cases pass. Added replacement probes expose
  one stale button-operation binding (`ui-collection-rebinding-negative.log`); record its captured
  operation and pass all 61 focused cases in six files. Feed adds 13 failures/34 controls
  (`ui-feed-resources-negative.log`); initial correction passes 98 cases in eight files. Two native
  observer reentry cases then fail (`ui-feed-observer-reentry-negative.log`); revision checks and
  provisional cleanup produce 105 passing cases in eight files (`ui-collection-current.log`).
  Focused type checking and lint pass after correcting a test helper type parameter and replacing an
  observer closure with revision checks. An initial type-check command named a nonexistent
  configuration; the corrected command uses `tsconfig.quality.test.json`. The immutable lint ratchet
  passes with 323 TypeScript files and 303 exact file/rule counts. Plan validation and all failure
  logs remain under `quality-refresh-2026-09-17`.
- Corrected choice fast `2026-09-17T17-49-21-737Z-84471` passes all six gates and all 2,502 units
  with no pending cases, on unchanged 889-file fingerprint
  `e0979fd571730a7516bf1e86ae7a8865c75a5242330dfbee36bea2c87a5b9b6c`. Its report SHA-256 is
  `9386fdeff5c3a569de08ab134eb6c5295799ce198ade50b705a00099c46868d2`. The collection changes
  postdate that report and require a new fast run. Code closure and AC-34 through AC-37 remain open.
- Choice fast `2026-09-17T17-44-56-558Z-69662` passes 2,502 unit cases and five gates, but fails the
  lint-boundary ratchet: three new optional accesses on the non-null native Select `labels`
  collection raise Multi Select's recorded count from three to six. Remove those three optional
  accesses without increasing the allowance. All other static analyzers pass. Both builds pass
  (`ui-choice-build.log`). The source-bound preview in
  `ui-choice-preview-consumers/measurements.json` records core 193,517 raw/63,117 gzip, CSP 150,702
  raw/44,820 gzip/39,352 Brotli, root 549,144 raw, and stores 205,315 raw/66,491 gzip. UI ESM is
  324,762 bytes, UI CommonJS 323,579 and root UMD 471,501. Core gzip exceeds its fixed limit by 117
  bytes, CSP Brotli by 352, root raw by 6,424, UI ESM by 6,298, UI CommonJS by 5,115 and root UMD by
  6,605. CSP graph exclusions pass; stores gzip has 69 bytes of headroom. This preview precedes the
  lint correction and is not installed-package acceptance.
- The native choice cohort enrolls Color Picker, Time Picker, Multi Select, Select and Combobox,
  bringing the implemented total to 39 families. `src/ui/lifecycle.ts` adds captured reset binding
  and timer cleanup. The five controller modules own native/form/label/option and floating
  resources, use the proper window/document, and stop callbacks after disposal. Multi Select
  preserves its selected/empty cleanup state and isolates sibling closing; Combobox retains inline
  behavior. Select/Combobox reset binding survives ordinary option rewiring. `test/runtime.test.ts`
  removes the three obsolete global active-record services, now owned by individual scoped
  controllers. The new public regression suite is `test/ui-choice-resource-lifecycle.test.ts` (104
  cases). Component, ownership and testing guides document the behavior. AC-34 through AC-37 remain
  open.
- `ui-choice-resources-negative.log` records 22 failures/14 controls and two late reset errors;
  picker corrections pass 92 tests in five files (`ui-choice-resources-first.log`). Multi Select
  adds 18 failures/39 controls (`ui-multiselect-resources-negative.log`); correction passes 122 in
  five files. The initial Select/Combobox probe records 32 failures/64 passes. First verification
  passes 189 cases with three fixture failures because the selected query hid the target option;
  clear the query and explicitly assert that the intended callback disposed the owner. The
  intermediate rerun retains one remaining instance of that fixture issue. Corrected focused
  verification passes 198 tests in seven files (`ui-choice-current.log`). The final integration
  passes 1,066 tests in 78 files (`ui-choice-integration.log`), including two final reset-realm
  cases. Type checking and focused lint pass before those final fixture additions
  (`ui-choice-current-types.log`, `ui-choice-current-lint.log`). Initial Plan validation passes
  (`ui-choice-plan.log`). All logs are retained under `quality-refresh-2026-09-17`; the next fast
  gate covers the full final cohort.
- Final floating fast run `2026-09-17T17-31-01-151Z-52360` passes all six gates and all 2,398 units
  with no pending cases on unchanged 888-file fingerprint
  `de8d03cf4ad0168bbe740f65ae61631dcfba698e83fd2206eeb53d39e614a232`. Report SHA-256 is
  `4f820489446a01949cfe754d0a3f57e96c49932d71f9673e5cb49f7786c5f6ed`; `ui-floating-fast-final.log`
  records exit zero. Current source, tests and API reports are covered; subsequent ticket/program
  checkpoint edits record results only. Code remains open for the remaining controller families and
  AC-34 through AC-37.
- Both distribution builds pass (`ui-floating-build.log`), followed by
  `node .git/jqstar/program-audit/quality-refresh-2026-09-17/measure-ui-floating-preview.mjs`.
  `ui-floating-preview-consumers/measurements.json` records exact source hashes and consumer graphs:
  core 193,517 raw/63,117 gzip (117 over gzip); CSP 150,702 raw/44,820 gzip/39,352 Brotli (352 over
  Brotli); root 547,465 raw (4,745 over); stores 205,315 raw/66,491 gzip (69 bytes below gzip
  limit). UI ESM is 323,088 (4,624 over), UI CommonJS 321,920 (3,456 over), and root UMD 469,827
  (4,931 over). CSP source and both format exclusions pass. Fixed limits remain unchanged; these
  development previews are not installed-package or delivery acceptance. Reduce duplication while
  completing the remaining scope, then rerun installed-package and full gates.
- Fast `2026-09-17T17-28-42-036Z-38208` passes static checks and 2,396 of 2,398 units.
  `ui-floating-fast.log` retains two integration failures: the API report warning location shifts by
  one source line, and `test/runtime.test.ts` still expects four global floating active-record
  services. Regenerate reports with `node scripts/build-types.mjs --local`; their public signatures
  remain unchanged. Update only those four obsolete ledger entries, since per-controller scoped
  records now own the active sets. The complete focused integration passes 962 tests in 77 files
  (`ui-floating-integration-current.log`). Repeat fast verification after these derived updates.
- Two-document verification passes 108 cases after removing an invalid transient fixture node
  (`ui-floating-documents-current.log`). The earlier log passes assertions but reports observer
  errors, and is not clean verification. Public add/remove-before-delivery probes then reproduce
  five failures/108 controls (`ui-floating-deferred-negative.log`). `src/ui/index.ts` now limits
  automatic observer enhancement to nodes still contained by its document; explicit detached
  acquisition remains supported. The floating resource suite now contains 113 cases. Type checking
  and focused lint pass before that last observer correction (`ui-floating-final-types.log`,
  `ui-floating-final-lint.log`); the next complete fast gate covers the final source.
- Floating enrollment adds Tooltip, Hover Card, Popover, Dropdown Menu, Context Menu and Menubar,
  bringing the implemented total to 34 families. `src/ui/floating.ts` shares record cleanup and
  interrupted native show handling, and resolves geometry in the owning window. The five controller
  modules own exact native listeners, panel state and timers, stop event/focus continuations, and
  filter unavailable roots. Menu and Menubar preserve pending work across unchanged enhancement.
  `test/ui-floating-resource-lifecycle.test.ts` is the public regression suite; component, ownership
  and testing docs record these guarantees. The whole controller/host scope remains open.
- `ui-floating-resources-negative.log` records 37 failures/12 controls; the first correction passes
  83 cases in six files. Replacement enhancement adds six reproduced failures with 50 passing
  controls (`ui-floating-replacement-negative.log`); correction passes 102 cases in seven files.
  `ui-menu-resources-negative.log` records 38 failures/66 passes and three unhandled callback
  errors, including two fixture cases missing their parameter. `ui-menu-resources-first.log` has
  four failures/136 passes: those two fixture errors, an overly broad timer-count assertion and a
  real preserved long-press cancellation. Corrected focused verification passes 140 cases in six
  files (`ui-menu-resources-current.log`). `ui-menubar-preservation-negative.log` then reproduces
  one pending-typeahead failure with 104 passing controls. The correction passes the 954-case,
  77-file UI/kernel/bridge integration (`ui-floating-integration.log`) before three final
  two-document cases. Initial type/lint diagnostics are retained; test timer overloads, missing
  parameters and non-null assertions were corrected. All logs share the quality-refresh directory.
- Form/pointer fast run `2026-09-17T17-16-08-280Z-21213` passes six gates and all 2,285 unit cases
  with no pending cases on unchanged 887-file fingerprint
  `4a43e59e8e6a1236cc884c25d56010dab39ea4c1bd852e63fecdc65d12e0738a`. Report SHA-256 is
  `717be7406c49b758029116938a6c3f511498bd510e893a5b4766be0b5d8e3ae6`. API extraction and both
  distribution builds pass. These results precede floating enrollment. The current corpus digest is
  `fd875f093ecae0e04e99f188500e8215c25b7b5001f9cb11be8d18651941d3a0`.
- `ui-form-pointer-preview-consumers/measurements.json` binds the preceding source and graphs to the
  built-distribution preview: core 193,517 raw/63,117 gzip (117 over gzip); CSP 150,702 raw/44,820
  gzip/39,352 Brotli (352 over Brotli); root 545,943 raw (3,223 over); stores 205,315 raw/66,491
  gzip (69 bytes below gzip limit). UI ESM is 321,574 (3,110 over), UI CommonJS 320,406 (1,942
  over), root UMD 468,300 (3,404 over). CSP source/module exclusions pass in both formats. Commands
  are both Vite builds followed by `measure-ui-form-pointer-preview.mjs`. Fixed ceilings remain
  unchanged; these previews do not replace installed-package or full delivery acceptance.
- The Form/pointer cohort implements cleanup in `src/ui/form.ts`, `src/ui/resizable.ts`,
  `src/ui/file-upload.ts`, `src/ui/sortable.ts`, `src/ui/input-otp.ts` and `src/ui/tags-input.ts`.
  `test/ui-form-pointer-resource-lifecycle.test.ts` now has 68 cases. `ui-form-pointer-negative.log`
  records 23 failures/six controls before Form/Resizable enrollment;
  `ui-upload-sortable-negative.log` records 14 failures/36 passes; `ui-entry-resources-negative.log`
  records 14 failures/54 passes. Corresponding focused runs pass 131 cases in six files for File
  Upload/Sortable and 100 in five files for Input OTP/Tags Input. The broader run before the last
  two families passes 831 tests in 76 files (`ui-form-pointer-integration.log`); type checking and
  focused lint pass (`ui-form-pointer-types.log`, `ui-form-pointer-lint.log`). These changes
  postdate the previous fast report and bundle preview below; full scope and delivery remain open.
- `src/kernel.ts` drains prior native removal records before scoped acquisition, rechecks
  availability after cleanup/observer setup and retains only deferred preserved removals.
  `ui-native-acquisition-negative.log` records two failures/14 passes and
  `ui-native-observer-setup-negative.log` one failure/17 passes before those corrections. Plan
  validation passes (`ui-native-acquisition-plan.log`). `test/scoped-resource-lifecycle.test.ts`
  adds four cases for detached acquisition, unrelated preservation and setup/cleanup disposal.
  `test/ui-form-association.test.ts` now checks cancellation of the notification queued before
  native cleanup, then verifies explicit detached validation after that boundary. The first cohort
  run records this old expectation failure (`ui-form-pointer-first.log`); the corrected seven-file
  run passes 99 cases (`ui-form-pointer-current.log`). The extra pointer run exposed a recursive
  mock (`ui-form-pointer-second.log`), fixed by capturing the original window registration before
  spying. The corrected two-file kernel/pointer run passes 50 cases (`ui-form-pointer-extra.log`).
- The Form/Resizable enrollment plan used `test/ui-form-pointer-resource-lifecycle.test.ts` for
  render/native/disposal/preservation, reacquisition and callback interruption. Form must release
  its five native listeners and invalidate queued reset/invalid callbacks; document handlers for
  associated external controls must become inert when the form record retires. Resizable must
  release window pointer sessions, capture and local handle listeners, including interrupted capture
  and before-change callbacks. Preserve native form association and existing
  resizing/part-replacement behavior. These paths are within the complete UI lifetime Plan above and
  remain under implementation.
- File Upload and Sortable follow in the same resource regression suite. File Upload owns native
  input/drag/form-reset listeners and ignores queued resets from retired controls or forms. Sortable
  owns list listeners and cancels temporary ordering on cleanup only while its captured list/items
  remain current; cleanup must not render an old preview into replacement parts. Both stop event
  continuations after owner disposal and filter outgoing roots during document enhancement.
- Input OTP and Tags Input enroll their captured native listeners through the same helper and
  invalidate event continuations after disposal. Input OTP's duplicate change/completion
  notification sequence is consolidated without changing event order; generated fields use their
  owning document. Resource regressions also cover these two families and retained native controls
  after reacquisition.
- Fast rerun `2026-09-17T16-57-49-807Z-3147` passes all six gates and all 2,213 unit cases with no
  pending cases. Its 886-file start/end fingerprint is
  `87ea4fab5b42eddbbce4a0dfb67940aa4830b5f6df20d58e5098564b66db7818`; `ui-controller-fast-final.log`
  records exit zero. At that checkpoint, only result documentation followed the report; the
  subsequent Form/pointer and floating cohorts supersede its source binding. Both distribution
  builds pass in `ui-controller-build.log`. These results do not close the remaining controller
  scope or replace full delivery and installed-package verification.
- `ui-controller-preview-consumers/measurements.json` records a fresh built-distribution preview
  with source hashes and consumer module graphs. Core is 193,173 raw/63,081 gzip (81 over gzip); CSP
  is 150,358 raw/44,782 gzip/39,253 Brotli (253 over Brotli); root is 544,510 raw (1,790 over);
  stores is 204,971 raw/66,468 gzip (92 gzip bytes below its limit). Distribution UI ESM is 320,502
  bytes (2,038 over), UI CommonJS 319,334 (870 over), and root UMD 466,866 (1,970 over). Both CSP
  format graphs pass their source/module exclusions. Measurement commands are `npx vite build`,
  `npx vite build --config vite.umd.config.ts`, then
  `node .git/jqstar/program-audit/quality-refresh-2026-09-17/measure-ui-controller-preview.mjs`.
  These are development measurements, not installed-package acceptance. Keep all limits fixed and
  reduce duplication while completing the remaining controller scope.
- `src/ui/tabs.ts`, `src/ui/disclosure.ts` and Dialog in `src/ui/index.ts` enroll exact listener
  cleanup and stop transitions after callback disposal. Dialog closes only runtime-owned modal state
  and resets its reflected state and trigger. `ui-navigation-resources-first.log` passes 104 cases
  across seven files. The preceding negative log has ten failures, of which one was an Accordion
  fixture missing `data-part="item"`; the corrected fixture passes and is not counted as a
  demonstrated source failure.
- `src/ui/toolbar.ts`, `src/ui/pagination.ts`, `src/ui/sidebar.ts` and `src/ui/toggle.ts` enroll
  native listeners and filtered enumeration. Sidebar uses its owning window for media queries and
  storage, releases the media listener and rejects shortcut reacquisition at a removal boundary.
  `ui-control-modal-negative.log` records 23 failures/69 passes before this cohort and the Dialog
  reflected-state correction; `ui-control-modal-first.log` passes 124 cases in seven files.
- `src/ui/stepper.ts` and `src/ui/editable.ts` release exact listeners and stop effects after event,
  validation or focus callbacks dispose the owner. `ui-stepper-editable-negative.log` records 13
  failures/96 passes; `ui-stepper-editable-first.log` passes 140 cases in five files.
- `src/ui/log-viewer.ts` releases filter/scroll listeners and invalidates queued scroll work.
  `src/ui/json-viewer.ts` owns its weak record and rejects further rendering after serializer or
  initial enhancement callbacks dispose it. Both use filtered enumeration and their owning document
  for generated nodes. `ui-viewer-resources-negative.log` records ten failures/112 passes;
  `ui-viewer-resources-first.log` passes 156 cases in four files.
- `src/ui/lifecycle.ts` releases provisional side effects when scope acquisition throws, preserving
  both errors if cleanup also fails. `ui-provisional-resources-negative.log` records one failure and
  122 passes before the correction. The expanded controller suite is
  `test/ui-controller-resource-lifecycle.test.ts`; public/brain guidance is updated in README,
  COMPONENT_ARCHITECTURE, RUNTIME_OWNERSHIP and TESTING. The current UI/kernel/plugin integration
  passes 707 tests in 71 files (`ui-controller-current.log`) and type checking passes
  (`ui-controller-current-types.log`). Focused lint initially requires a caught-error cause on the
  cleanup AggregateError; that diagnostic is retained in `ui-controller-current-lint.log`. These
  changes postdate the fast run below. AC-34 through AC-37 and Code closure remain open.
- Fast run `2026-09-17T16-55-41-089Z-88222` passes all 2,213 unit cases with no pending cases;
  formatting rejects five edited brain/ticket documents. The failed run remains in
  `ui-controller-fast.log`. Format those documents before repeating the gate. API Extractor passes
  (`ui-controller-api.log`), focused lint passes after preserving the caught cleanup error's cause
  (`ui-controller-current-lint-fixed.log`), and generated CSP inventory validates 240 public sources
  and 421 occurrences. README line changes update the corpus digest to
  `30ec1b41f569b21040136f44dcd78d7dae9540f2ffcaf19c986a0ddf76184740`; grammar/examples are
  unchanged.
- The next enrollment cohort covers Password Field, Number Field, Search Field, Rating, Clipboard
  and Code Block. `ui-controller-resources-negative.log` retains 25 failures and ten live controls
  before implementation. `test/ui-controller-resource-lifecycle.test.ts` checks render/native/
  disposal cleanup, preservation, reacquisition, callback reentry, pending Rating reset and resolved
  or rejected pending copies. A shared `ownUIRecord` helper in `src/ui/lifecycle.ts` removes stale
  weak records before cleanup. The four fields release exact listeners, Rating cancels its captured
  window's reset, and both copy controllers suppress retired DOM/events while preserving promise
  results/errors. Clipboard also releases its reset timer and restores temporarily disabled copy
  buttons during cleanup. Existing part-replacement semantics remain covered. The first cohort
  verification passes 137 cases in nine files (`ui-controller-resources-first.log`) and type
  checking passes (`ui-controller-resources-types.log`). This work follows the prior fast run below
  and needs its own integration gates; the remaining controller families are still required.
- Final fast run `2026-09-17T16-35-52-711Z-69615` passes all six gates and all 2,090 unit cases,
  with no skipped cases and identical 885-file start/end fingerprint
  `1ce3955c3bb4cc637201a569aeccfd69d09b8aa6db562d4a41ea3234abdd65d8`. `npm run quality:fast` exits
  zero (`ui-lifetime-fast-final.log`). This remains Code-phase evidence: controller enrollment is
  incomplete, the measured bundle excess remains, and no current full delivery or Code closure is
  claimed. The controller enrollment above postdates this passing implementation run and requires
  fresh integration and delivery evidence.
- `scoped-resource-current.log`: 184 kernel/plugin/render/public UI cases pass across eight suites.
  `ui-lifetime-all-ui.log`: 549 cases pass across all 68 UI suites before the final
  isolation/barrier additions. Both are focused development evidence, not delivery acceptance.
- `ui-lifetime-api.log`: declaration generation and API Extractor pass. Core/root reports add the
  optional Element scope and availability method. Keep existing line endings for unchanged report
  lines, avoiding generated CRLF churn. The UI report's source-location warning also refreshes.
- Fast run `2026-09-17T16-28-54-243Z-40319` fails: 2,087 of 2,089 unit cases pass. The runtime
  ledger expectation needs the new `ui:lifecycle` service; the CSP example inventory needs updated
  README line locations. `test/runtime.test.ts`, `test/fixtures/csp/conformance-map.json`, the
  measured digest in `src/csp/contract.ts` and its public API report are updated. CSP grammar and
  examples do not change. The first inventory-only retry retains its digest mismatch in
  `ui-lifetime-fast-corrections.log` before the matching digest refresh.
- Corrected fast run `2026-09-17T16-32-45-039Z-55087` passes static checks and 2,089 of 2,090 unit
  cases. The remaining entrypoint test hard-codes the preceding corpus digest. Its expectation and
  the installed-package identity check in `scripts/quality-package.mjs` now match the independently
  regenerated digest `0b61f627b3c50e95d5fc25a9a06053c26aa305e31e91b7dbbf677d13cdcf4bd6`.
- The first fast run's static failures identify one added kernel non-null assertion and an iframe
  timer mock resolved against Node's timer overload. A type predicate replaces the assertion, and
  the browser timer mock retains its Window type. `ui-lifetime-boundaries.log` passes all 318
  TypeScript paths and 303 exact rule entries without changing allowances;
  `ui-lifetime-test-types.log` passes the strict test TypeScript check.
- The shared guard now also refuses Toast calls and document-wide enhancement during kernel cleanup,
  before the UI service's own release callback. A public cleanup-reentry case verifies no late Toast
  DOM or timer is created.
- Built-consumer preview `ui-lifetime-current-consumers/measurements.json` reports core gzip 63,076
  bytes against 63,000 and CSP Brotli 39,310 against 39,000 before the last guard/type corrections.
  Limits remain fixed. Installed-package acceptance and further size reduction remain required. The
  current source/API additions also need fresh audit ownership and claim bindings.
- The final preview after those corrections
  (`ui-lifetime-final-preview-consumers/measurements.json`) binds eight current runtime source
  hashes and measures core gzip 63,081 and CSP Brotli 39,307. The remaining excess is 81 and 307
  bytes respectively. Focused digest/public UI verification passes all 25 cases in
  `ui-lifetime-digest-regressions.log`.

Current final source-pass correction changes thirteen UI modules: shared floating identity/ARIA
helpers; Menu, Select and Combobox document/label/reset behavior; Toast and Questionnaire labels;
Tree IDs/activation; Data Table selection history/disabled controls; Calendar/picker parts/cache/
focus; and Dialog, Feed, Popover/Hover Card reuse of the shared comparison. Four new lifecycle test
files and the component, ownership and testing guides accompany them. The selected changes are
integrated after root Plan validation (`final-ui-root-plan.log`); previous delivery excludes them.
Normal root build and current gates follow.

All selected Feed/Message Scroller, Form cleanup/OTP coverage, Resizable/Transfer List,
Stepper/Menubar and Sortable changes are now integrated after the predecessor delivery ends and root
Plan validation passes (`ui-expanded-root-plan.log`). Eight source files, six tests and three guides
are copied selectively. Earlier isolated descriptions are historical preparation records; current
root build, measurement, source/claim refresh and fast/full verification follow.

The Countdown, Tabs/Dialog and Input OTP/Tags Input batches, plus the Editable placeholder removal,
are selectively integrated after the predecessor delivery ended. Root Plan validation passes in
`ui-batch-root-plan.log` before these six source and three test files are copied. The three affected
guides are included; current root build, measured Mobile metadata, fast/Code and full/Test follow.

`src/declarative.ts` now includes every owned cleanup record during full root cleanup, including
detached nodes. Other subtree cleanup still uses containment and preserved-root exclusions. New
`test/declarative-detached.test.ts` exercises both teardown modes, throwing cleanup, native and
jQuery listeners, model input and an unaffected live sibling after a scoped patch.

### Changed-file ledger

Countdown fast `2026-09-19T15-33-15-546Z-92219` passes all six gates and 2,765 unit tests with no
failed/pending cases. Its start/end fingerprint matches across 895 files:
`add03628e7a8c07d670d59a16ddada8e3b3eef35629c9cad10c40ebbdd21e344`. Report SHA-256:
`dab9c86da1d9b409673850b4e0f8d33516a847d450975ea5f84c927b32e7c960`. Session 46718 is terminal exit
zero. Source, tests and guidance stayed frozen during the run. Only ticket/audit result and
next-Plan edits follow it. Plan validation passes; actual Code/Test closure and full delivery remain
pending.

The separate `ui-controller-acquisition-negative.log` executes five failing Carousel/Message
Scroller acquisition cases with no fixture errors. Their private `.git` configuration and source are
retained. `ui-realm-browser-probe.log` records the first Chromium lease failure; the corrected
independent-document diagnostic completes and retains `ui-realm-independent-browser-result.json`,
its script, bundled JavaScript and 83 input hashes. Chromium 151.0.7922.34 passes foreign Toast
ownership and rejects the foreign Countdown target. This browser counterexample is outstanding audit
evidence outside the fast unit inventory; it is not a full host matrix or API compatibility pass.

Corrected fast `2026-09-19T15-57-04-145Z-26085` passes all six gates and all 2,807 unit tests, with
zero failed/pending cases and matching 896-file start/end fingerprints. The initial failed format
run remains in the ledger. Source, tests, guidance and the next frame/adoption Plan stayed frozen
through verification; subsequent ticket/audit edits only record this result. Full delivery and
Code/Test closure remain pending.

The September 19 disclosure/editable/stepper group changes `src/ui/disclosure.ts`,
`src/ui/editable.ts` and `src/ui/stepper.ts`: native DOM identity, captured document/window
resources, current-part checks, exact stable bindings, immediate destination reacquisition,
provisional setup, complete cleanup/reentry and callback revisions. Disclosure preserves native
toggle notification and summary default actions; an Accordion revision stops older work across
sibling callbacks. Editable preserves committed/draft state and selection, composing keys and native
textarea Enter. Stepper commits accepted proposed transitions, retains completion and checks native
validation continuation. `test/ui-disclosure-step-document.test.ts` adds 79 cases. Existing browser
fixture/spec add 72 executions, extending the matrix to 300 across twenty families. Component,
ownership and testing guides document the behavior. `quality/lint-boundaries.json` reduces Stepper's
existing non-null assertion allowance from eight to six after validation removes two uses. No shared
helper, public signature or fixed budget changes, and no allowance increases.

The first 72 public cases fail 59. Expanded native-link/late-cancellation/close-callback tests
produce 62 failures and 12 controls in the 74-case final negative
(`ui-disclosure-step-public-negative-final.log`). The first correction passes 227 focused cases in
six files. Five further cases reproduce two constraint failures: Editable commits after its
before-change callback disables the control, and Stepper advances after before-change invalidates
the active native input. Both are corrected; final focused verification passes 232 cases, including
all 79 new regressions (`ui-disclosure-step-focused-final.log`). Initial lint diagnostics for typed
part tuples and error formatting are corrected. Complete UI/kernel/bridge integration passes 1,771
cases in 92 files. TypeScript and focused lint pass. The immutable ratchet initially detects the two
removed Stepper assertions; after reducing the allowance to six it passes 337 TypeScript files / 302
exact file/rule counts. All 300 browser cases across twenty families and three engines pass with
zero failures/skips/flakes. All 124 captured source/configuration hashes match at terminal. The
original ten ignored disclosure/editable/stepper probes pass. Logs/bindings use the
`ui-disclosure-step-*` prefix under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Eight
next-group choice/time failures are recorded in the Plan above.

Final fast `2026-09-19T17-18-21-470Z-45288` passes all six gates and all 3,157 unit tests with zero
failed/pending cases. Its 904-file start/end fingerprint matches:
`ec59d2a5116dd40c347fe8a0d76d4ebbec8969971a88fd75ea3ea5718080d7b6`. Report SHA-256 is
`84a1078a893f33d15f45e624961f90f185363dc8f0cbae43f1537ff4962bf483`. Session 81127 is terminal exit
zero. Source, tests, guides, ratchet reduction and next-group Plan stayed frozen during the gate;
only tickets 0006/0033 and PROGRAM_AUDIT result documentation changes afterward. The 300 browser
cases and all 124 captured input hashes still match. Plan validation passes; actual Code/Test
closure, full `npm run check`, AC-34 through AC-37 and complete delivery remain pending.

The September 19 navigation group changes `src/ui/tabs.ts`, `src/ui/toolbar.ts`,
`src/ui/pagination.ts` and `src/ui/sidebar.ts`: native DOM identity, captured resource ownership,
current-part checks, stable bindings, destination reacquisition, provisional setup, complete cleanup
and callback revisions. Sidebar retains a resource-free weak state snapshot across disposal and
adoption and guards close focus return. Pagination preserves modified/non-primary link navigation.
`test/ui-navigation-document.test.ts` adds 70 cases. Existing
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add 54 executions
for all four families, including actual Sidebar viewport transitions. Public component, runtime
ownership and testing guides describe the changes. No shared helper, public signature, lint
allowance or fixed budget changes. The first 62 public cases fail 53; first focused verification
passes 217. Eight follow-ups reproduce one collapse-mode failure, then the complete focused suite
passes 225 in seven files. Integration passes 1,692 tests in 91 files. TypeScript and focused lint
pass; the immutable ratchet reports 336 TypeScript files / 302 exact file/rule counts, with no
allowance changes. Initial lint and ratchet failures from new non-null assertions were corrected in
source/fixtures. All 228 browser cases pass across sixteen families and three engines, with zero
failures/skips/flakes and all 124 source/configuration hashes matching at terminal. Logs and
bindings use the `ui-navigation-*` prefix under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`. The original eight ignored navigation
probes now pass. Six next-group disclosure/editable/stepper failures and four controls are recorded
in the Plan above.

Final fast `2026-09-19T17-03-43-833Z-27619` passes all six gates and all 3,078 unit tests with zero
failed/pending cases. Its 903-file start/end fingerprint matches:
`4b3def3f061c22ffdfefe673c90b2b8ca499ee39cefbadb1ec8b55a2a8e15cd9`. Report SHA-256 is
`c7346d18320f1c6009391f3836af23dcfbd9f02e1be3ecbabb62d330666bafa2`. Session 31289 is terminal exit
zero. Source, tests, guides and next-group Plan stayed frozen during the gate; only tickets
0006/0033 and PROGRAM_AUDIT result documentation changes afterward. The 228 browser cases and all
124 captured input hashes still match. Plan validation passes, while actual Code/Test closure, full
`npm run check`, AC-34 through AC-37 and complete delivery remain pending.

The September 19 Input OTP/Tags Input/Toggle group changes `src/ui/input-otp.ts`,
`src/ui/tags-input.ts` and `src/ui/toggle.ts`. Records capture owning document/window resources, use
shared native identity and reacquire adopted roots before facade use. Provisional listeners,
complete release and cleanup reentry use the shared helpers. Unchanged enhancement preserves exact
bindings, generated slots/tags/form inputs, draft selection/composition and roving focus. Revisions,
current parts and effective constraints stop stale transitions, native notifications and status.
Input OTP uses the existing owned form-reset helper and weak reflected-value state. Unchanged
focus/enhancement keeps completion pending until its originating operation notifies. Toggle Group
accepts an explicitly empty optional value and cleans up failed native form-field generation.
`test/ui-token-toggle-document.test.ts` adds 80 public cases. Existing browser fixture/spec add 54
executions, bringing the document suite to 174 across twelve families and three engines. Component,
ownership and testing guides document these contracts. No public signature, lint allowance or fixed
budget changes.

Initial public tests fail 50 of 60 cases (`ui-token-toggle-negative.log`). The first correction
passes 212 tests in six focused files; expanded cleanup/reset/constraint cases pass 227. Two further
negative cases reproduce lost completion during unchanged focus/enhancement. A final setup probe
reproduces leaked Toggle Group listeners when a generated form input's append throws. Both are
corrected. The final focused suite passes 232 cases in six files, including two positive
native-reset controls for generated values. Integration before those two controls passes 1,620 cases
in 90 files; the complete fast gate includes the added controls. TypeScript and focused lint pass;
the unchanged ratchet reports 335 TypeScript files / 302 exact file/rule counts. All 174 real
browser cases pass with no failures/skips/flakes, and all 124 captured source/configuration hashes
match at terminal (`ui-token-toggle-browser/results.json`, `ui-token-toggle-browser-inputs.json`).
Logs are under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Fast verification follows.
The next navigation probe has five failures and three passing adoption controls; the Plan above
preserves their exact scope. Full AC-34 through AC-37 and complete delivery remain open.

Final fast `2026-09-19T16-48-57-334Z-9908` passes all six gates and all 3,008 unit tests with zero
failed/pending cases, including the final two native-reset controls. Its 902-file start/end
fingerprint matches: `ae12bccd34480dcabaebca4f792b9d86aa2c1eb535098437f5b8c60d3b3e9676`. Report
SHA-256 is `50f8a83709ba7798bd1f651a4cb5a993a96168aaeda5cbbcf6bdd15353095bb0`. All 174 browser cases
and 124 input hashes remain current. Source/tests/guides and the next-group Plan stayed frozen; only
tickets 0006/0033 and PROGRAM_AUDIT result documentation changed after the terminal gate. Full
delivery and Code/Test closure remain pending.

Verification uses the pinned Node 24 path and these commands:

```sh
npx vitest run test/ui-token-toggle-document.test.ts test/ui-input-otp.test.ts test/ui-tags-input.test.ts test/ui-toggle.test.ts test/ui-otp-tags-lifecycle.test.ts test/ui-controller-resource-lifecycle.test.ts
npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts
JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY="$PWD/.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-token-toggle-browser" npx playwright test e2e/ui-document-ownership.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit
npm run typecheck
npx eslint src/ui/input-otp.ts src/ui/tags-input.ts src/ui/toggle.ts test/ui-token-toggle-document.test.ts e2e/fixtures/ui-document-ownership.ts e2e/ui-document-ownership.spec.ts
node scripts/quality/check-lint-boundaries.mjs
npm run quality:fast
```

The September 19 native-field document group changes `src/ui/number-field.ts`,
`src/ui/password-field.ts`, `src/ui/search-field.ts` and `src/ui/rating.ts` for native DOM identity,
captured ownership, immediate destination reacquisition, provisional listeners and revision/part
checks after callbacks. Number/Search/Rating reflected state is weakly retained separately from live
resources. `src/ui/lifecycle.ts` adds owned form-reset listeners and provisional timers for those
three controllers. Cancellation, replacement, adoption and newer operations invalidate queued work;
unchanged enhancement retains it. Password Field still rejects setup interrupted by disposal.
`test/ui-native-field-document.test.ts` adds 70 public cases. Existing browser fixture/spec add 66
executions, for 120 combined across three engines. Component/ownership/testing guides document the
contracts. No public API, fixed budget or lint allowance changes.

The initial 56-case unit suite fails 45 cases, with two errors from leaked callbacks after failed
setup (`ui-native-field-negative.log`). The first correction passes 91 of 92 focused tests; its
remaining Rating case requires keeping queued reset work through unchanged enhancement. Four later
cleanup tests need their teardown to expect the retained terminal disposal error. The broad run also
finds Password Field's existing interrupted-setup rejection, which is restored. Three further
negative cases prove that before-change callbacks can alter Number Field constraints, Search Field's
native value and a requested Rating radio's value. Current checks stop those superseded transitions.
The first 120-case browser matrix passes without failures/skips/flakes before the final rejection
and constraint corrections. The final rerun also passes all 120 cases with zero failed/skipped/flaky
results (`ui-native-field-browser-final/results.json`); all 124 captured inputs match at terminal.
Final integration passes 1,541 cases in 89 files, TypeScript/focused lint pass, and the unchanged
ratchet reports 334 TypeScript files / 302 exact counts. Fast verification follows. Preserve all
logs under the September 19 quality-refresh directory. Full AC-34 through AC-37, budgets,
source/claim review, host conformance and complete delivery remain open.

Native-field fast `2026-09-19T16-32-43-118Z-77099` passes all six gates and 2,927 unit tests before
final review. That review catches an unintended readonly check in the Search Field helper, which
blocks an otherwise valid native form submission. An added public test fails, then removing that new
condition restores the existing behavior. The final group has 70 new public cases. Final browser,
integration and fast evidence must cover this correction; the prior green report remains historical.

Final native-field fast `2026-09-19T16-35-22-391Z-91661` passes all six gates and all 2,928 unit
tests with zero failed/pending cases. The 901-file start/end fingerprint matches
(`ae9986626e50d38a637fb069b601f28fbd395ba0301a4035e4b96563e59f3a5f`); report SHA-256 is
`9d6bf1255fe4ed6be1c741809fb16f1e7b9c34803fb78022b2a9fa800cd558bd`. It covers the readonly
submission correction and all 70 new public cases. Final integration passes 1,542 cases in 89 files
(`ui-native-field-integration-verified.log`), and all 120 browser cases pass without
failures/skips/flakes (`ui-native-field-browser-verified/results.json`). All 124 browser input
hashes match at terminal. Source, tests, guides and the next-group Plan stayed frozen; later edits
to this ticket, 0033 and PROGRAM_AUDIT only record results. Full delivery and Code/Test closure
remain pending.

Verification uses the pinned Node 24 path (`/opt/homebrew/opt/node@24/bin` plus the repository's
`.git/jqstar/tools/bin`). Commands for this group:

```sh
npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts
JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY="$PWD/.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-native-field-browser-verified" npx playwright test e2e/ui-document-ownership.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit
npm run typecheck
npx eslint src/ui/number-field.ts src/ui/password-field.ts src/ui/search-field.ts src/ui/rating.ts src/ui/lifecycle.ts test/ui-native-field-document.test.ts e2e/ui-document-ownership.spec.ts e2e/fixtures/ui-document-ownership.ts
node scripts/quality/check-lint-boundaries.mjs
npm run quality:fast
```

The September 19 document-ownership first group changes `src/dom.ts` for lazy native DOM identity
and HTML tag predicates, including adopted input/select controls; `src/kernel.ts` for document-aware
render boundaries; `src/ui/lifecycle.ts` for shared facade/enumeration/enhancement checks; and
`src/ui/index.ts` for Dialog ownership, events, focus, native modality recovery and automatic added
nodes. `src/ui/countdown.ts`, `src/ui/carousel.ts` and `src/ui/message-scroller.ts` replace realm
constructor assumptions. Carousel/Scroller facade calls reacquire stale destination records;
Carousel preserves user pause, recalculates focus pause and avoids repeated disabled writes.
`test/dom-realm.test.ts` adds 16 cases and `test/ui-document-ownership.test.ts` adds 35.
`e2e/fixtures/ui-document-ownership.ts` and `e2e/ui-document-ownership.spec.ts` add 54 executions in
three browser engines. Component, ownership and testing guides and tickets/audit ledgers record
these contracts and limits. No public signature, lint allowance or bundle ceiling changes.

Logs live under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Initial public tests have
22 failures and 16 passing controls plus two native observer errors from adopted-part rejection
(`ui-document-negative.log`). The first corrected run exposes fixture bookkeeping mistakes: a spread
jQuery callable cannot create a render adapter, and disposal removes its mutable star property.
Retaining the facade and passing the original jQuery callable fixes those fixtures. Action/control
fixtures also needed valid `data-bind:name` syntax and a selector-based Dialog action in jsdom,
which lacks native CSS.escape. Later negative logs reproduce stale facade records, redundant
disabled writes and focus-pause errors. Preserve all negative/fixture logs.

The first actual browser attempt is intentionally interrupted after a WebKit timeout and busy
process. Its terminal report records 28 expected, nine unexpected and eleven skipped cases; it
provides no acceptance. Eight failures are Dialog modality, and WebKit's Carousel case times out. A
bounded observer diagnostic on the real host logs repeated next-button disabled mutations;
disconnecting after a diagnostic cap is only tracing, never the production correction. The corrected
48-case matrix passes, then the expanded final matrix passes all 54 cases with zero
failed/skipped/flaky results (`ui-document-browser-final/results.json`). All 124 captured browser
input hashes match at terminal. The final UI/kernel/bridge/harness/declarative integration passes
1,472 cases in 88 files (`ui-document-integration-final.log`). TypeScript, focused lint and the
unchanged immutable ratchet pass (333 TypeScript files / 302 exact file-rule counts).

The refreshed original Chromium diagnostic (`ui-realm-document-browser-result.json`) now passes the
foreign Countdown facade, explicit foreign enhancement and adopted destination facade, with 83
bundle inputs retained. Its test-realm lease still cannot redefine protected browser window; that
separate limitation grants no exclusion from ordinary document support. Initial fast
`2026-09-19T16-15-18-770Z-44732` passes 2,857 units but fails one API drift test because that
warning line moved; its static gate also flags two dynamically imported fixture exports. Formatting
and all other static checks pass. Regenerate the API report and use direct type references before
rerunning the full gate.

Corrected fast `2026-09-19T16-21-16-823Z-59758` passes all six gates and all 2,858 unit tests with
zero failed/pending cases on matching 900-file fingerprints
(`8012ae3915f5a289fec2c7bb90cc45e7b1ce0d80f413390c163f3d89505d28de`). Canonical API generation
passes with only the warning line update. The browser rerun after explicit fixture type references
passes all 54 cases in `ui-document-browser-verified/results.json`, with all 124 input hashes
verified at terminal. Full delivery and Code/Test closure remain pending.

This first group covers four families; all other family/document/host and full-audit work remains.

The September 19 Carousel/Message Scroller correction changes `src/ui/lifecycle.ts` for shared
internal resource state, guarded native acquisition, complete release and combined setup/cleanup
errors. `src/ui/carousel.ts` owns provisional timeout identities, retains unchanged bindings,
deadlines and swipes, weakly retains user pause and commits slide selection only after an accepted,
current before-change event. Repeated native focus pauses do not interrupt normal focus recovery.
`src/ui/message-scroller.ts` owns provisional timers/observers/listeners, retains
follow/unread/message identity separately from live ownership and stops stale scrolling/focus
continuations. Native cancellation or listener cleanup can acquire newer work without the retiring
record removing it. `test/ui-carousel-scroller-resource-lifecycle.test.ts` adds 42 public cases. The
component, ownership and testing guides, tickets 0006/0033 and PROGRAM_AUDIT record these contracts
and evidence. No public signatures, bundle ceilings or lint allowances change.

Evidence is under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`. The original 28 public
cases all fail before implementation (`ui-carousel-scroller-negative.log`). The first implementation
run catches a wrong content-lookup variable; the next has one observer fixture targeting kernel
acquisition instead of the controller observer. Expanded reentry tests expose four further failures:
loss of the setup error during failing cleanup, uncommitted selection exposed to a newer pause and
unchanged enhancement interrupting selection (`ui-carousel-scroller-reentry-negative.log`). A normal
focus control exposes an internal focus pause suppressing `change`; observer constructor fixtures
also needed to establish kernel ownership first and preserve the native observer prototype. Two
intermediate integration attempts retain those fixture failures. All failure logs remain available.
The corrected five-file focused suite passes 86 cases (`ui-carousel-scroller-focused-final.log`),
and TypeScript/focused lint pass (`ui-carousel-scroller-types-verified.log`,
`ui-carousel-scroller-lint-verified.log`). The original five ignored acquisition probes now pass
(`ui-controller-acquisition-fixed.log`). Full integration passes 1,384 tests in 85
UI/kernel/scoped-resource/bridge/harness files (`ui-carousel-scroller-integration-verified.log`).
The unchanged immutable ratchet passes 329 TypeScript files and 302 exact file/rule counts
(`ui-carousel-scroller-ratchet-verified.log`). Initial fast `2026-09-19T15-54-07-908Z-11639` passes
all 2,807 units and static checks on an unchanged 896-file fingerprint, but fails formatting in six
documentation files. Its failure log is retained; format those files and rerun the complete fast
gate. This correction does not close AC-34–AC-37 or the frame/adoption, budget, host and
full-delivery work.

The September 19 Countdown cross-cutting correction changes `src/ui/countdown.ts` to separate weak
retained state from live ownership and register provisional shared interval leases before native
scheduling. It detaches leases before cancellation, guards late ticks and operation continuations,
rolls back all failed participants, retires old-document work and uses owning-window completion
events. `test/ui-countdown-resource-lifecycle.test.ts` adds 19 public cases. Component, ownership
and testing guidance describes the behavior and corrects obsolete Countdown cleanup wording. The
public enrollment list now includes Calendar and both picker families. Tickets 0006/0033 and
PROGRAM_AUDIT record results and the complete remaining scope. No public signatures, budgets or lint
allowances change in this correction.

Logs are under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Both initial 15-case probes
fail before the source correction (`ui-countdown-negative.log`,
`ui-countdown-negative-isolated.log`); they retain two Vitest reporting errors. The latter drains
escaped callbacks between fixtures and compares timer identity without serializing the opaque
handle. First corrected verification passes 47 cases in four files (`ui-countdown-first.log`); the
expanded focused suite passes 51 (`ui-countdown-reentry.log`). The final integration passes 1,342
tests in 84 UI/kernel/scoped-resource/bridge/harness files (`ui-countdown-integration.log`).
TypeScript and focused lint pass after correcting callback narrowing
(`ui-countdown-types-current.log`, `ui-countdown-lint-current.log`). The immutable ratchet passes
328 TypeScript files and 302 exact file/rule counts without inventory changes
(`ui-countdown-ratchet.log`). The original ignored Countdown/realm diagnostic now passes both cases
(`ui-crosscut-probe-countdown-fixed.log`). Fast verification follows; complete cross-cutting audit,
source/claim review, fixed budgets, actual-host matrices and current full delivery remain required.

Calendar fast `2026-09-19T15-20-42-173Z-75442` passes all six gates and all 2,746 units with zero
failed/pending cases. Its start/end fingerprint matches across 894 files:
`61c48a7a3ed626a7a5ee60cd8a9dfb58afc9b2f854728e95477f5236d50d960a`. Report SHA-256 is
`64840860e040efc4c6a9dd066d803c13925b3defa7a66eb25a8fa96464d22ad8`; session 12844 exits zero. The
additional Turbo/htmx/harness integration passes 54 cases in three files
(`ui-calendar-host-integration.log`). Source, tests and guidance were frozen through fast;
subsequent ticket/audit edits record results and the next Plan. No Code/Test phase closure is
claimed.

The isolated `ui-crosscut-probe-allowed.log` passes the realm-identity probe and fails Countdown's
immediate interval cleanup assertion (zero clear calls). It runs outside the required unit inventory
and is direct outstanding failure evidence, not a passing gate. The initial diagnostic attempt could
not load a file under `.git`; explicitly allowing that ignored fixture in its private Vitest
configuration produces the two executed cases. All diagnostic files live beside the Calendar logs.

The September 19 Calendar cohort changes `src/ui/calendar.ts` for scoped records/listeners,
transition and focus revisions, captured document/window operations, native form reset ownership,
weak retained focus/initial seeding and consistent normalized native ranges. The new
`test/ui-calendar-resource-lifecycle.test.ts` supplies 84 public cases.
`quality/lint-boundaries.json` removes Calendar's obsolete two-count unnecessary-condition allowance
after the duplicate optional checks disappear; no allowance increases. Component, runtime-ownership
and testing guidance records the behavior, while tickets 0006/0033 and PROGRAM_AUDIT retain evidence
and remaining audit scope.

Calendar verification logs live under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`.
`ui-calendar-negative.log` records 30 failures/eight controls and six errors caused by picker
continuations after disposal. The first correction passes 62 cases but records two observer errors
from a connected setup-failure fixture; detaching that fixture prevents unrelated automatic retry.
`ui-calendar-acquisition.log` passes 83 cases in four files. The reset/realm probe records seven
failures/68 controls; one reversed-range fixture is corrected, then a separate test proves the
actual native/Calendar normalization mismatch. A foreign fixture also captures `star` before
disposal removes the installation property. `ui-calendar-empty-reset-negative.log` records three
failures/79 controls. Final `ui-calendar-realm-reset.log` passes 108 cases in four files, including
all 84 new cases. `ui-calendar-integration.log` passes 1,269 tests in 80 UI/kernel/scoped-resource/
bridge-disposal files. The immutable lint ratchet passes 327 TypeScript files and 302 exact
file/rule counts after removing Calendar's obsolete allowance. Final TypeScript and focused ESLint
checks pass (`ui-calendar-types-complete.log`, `ui-calendar-lint-final.log`). Fast verification
follows. The full ownership scope, cross-cutting review, fixed budgets, host matrix and AC-34–AC-37
remain open.

`test/runtime.test.ts` updates the exact persistent service/observer inventory for Toast's
installation lifetime and shared kernel removal handling.

The September 19 Toast cohort changes `src/ui/toast.ts` for scope/viewport ownership, captured
document/window timing, weak remaining state, current bindings, guarded dismissal, swipe capture,
composed pauses and creation rollback. `test/ui-toast-resource-lifecycle.test.ts` adds 42 public
cases. Component, runtime-ownership and testing guidance describes the guarantees; tickets 0006/0033
and PROGRAM_AUDIT record results and the remaining scope. No public API, budget ceiling, coverage
floor or realm-testing contract changes.

The September 19 Questionnaire cohort changes `src/ui/questionnaire.ts` for scoped cleanup, captured
timers, retained state, owning-document fieldsets/skip controls and guarded transitions.
`test/ui-questionnaire-resource-lifecycle.test.ts` adds the public resource/reentry cases. The
component, runtime-ownership and testing guides describe those guarantees; tickets 0006/0033 and
PROGRAM_AUDIT record the evidence and remaining complete scope. No public API or budget changes.

Sortable's generated-input lookup now filters by the closest Sortable root before comparison or
removal. Five added lifecycle cases use detached native forms to cover independent nested
serialization and input identity. The same three guides describe this ownership boundary. Four of
the five new cases fail the preceding source; the child-operation control passes. Original failures
remain in `sortable-nested-negative.log` alongside the Plan and public probe.

The isolated Sortable correction uses JSON equality for exact order comparisons and retains a
preview shortcut only while the current list and item identities match. Changed parts follow normal
validation and exact old callback cleanup before current controller creation. Seven new cases cover
separator values, preview replacement and unchanged preview continuation.

The isolated Stepper change moves its finished-state reset after successful before-change dispatch.
Menubar reconciles open index, root state/value and active trigger from current child states after
close requests. `test/ui-transition-cancellation.test.ts` adds seven public/native cancellation
cases. No resource lifetime or public event schema changes are introduced.

The isolated Resizable correction validates current parts on enhancement, retains unchanged active
sessions, and releases exact old native bindings/capture before replacing parts. Window pointer
listeners are registered only when a session starts and removed by its consumed cleanup. Movement
after root disconnection cancels without sizing writes. Transfer List uses JSON equality at its two
value-comparison sites. Ten Resizable and three Transfer List tests reproduce all 13 original
failures. Component/ownership/testing contracts are updated in the isolated checkout.

The isolated verification follow-up removes Form's unused cleanup field/closure and placeholder;
local native registrations remain one-time and host external cleanup is unchanged. The existing
OTP/Tags lifecycle suite adds three native fallback/cancellation cases and current-focus assertions.
The live root coverage failure remains recorded; no synthetic cleanup invocation or threshold change
is introduced.

The isolated `src/ui/message-scroller.ts` correction shares automatic scheduling and checks current
root connection/following before deferred writes. Explicit latest remains immediate. Feed tracks
controller-generated article title/description IDs in a WeakMap and refreshes current associations
while preserving authored ARIA. `test/ui-feed-scroller-lifecycle.test.ts` adds 17 cases. The same
three guides document these bounded guarantees. This batch is not in the live root delivery.

`src/ui/form.ts` queries current `form.elements` and shares native validation updates between local
form events and three host-owned external-control event listeners. `src/ui/index.ts` passes the
DocumentHost. No external controls are retained. Popover and Hover Card track generated title IDs
through a shared helper in existing `src/ui/floating.ts`; it preserves authored ARIA and updates
current parts. The new association and floating-label suites contain 23 cases. The UI API snapshot
refresh changes only an existing diagnostic line number. Component, ownership and testing guides
record these contracts.

`src/ui/input-otp.ts` and `src/ui/tags-input.ts` resolve current parts, release exact old callbacks
and rebind one retained controller. The Tags Input list cache is invalidated for a new list
identity. Private input/completion/committing fields are shortened while public events retain their
existing schema. Optional construction-time cleanup avoids unreachable placeholders. The new
`test/ui-otp-tags-lifecycle.test.ts` has ten cases, with current-part guarantees in the same three
guides. These changes are now selectively integrated after the predecessor full run ended.

The isolated Tabs correction releases/clears the previous trigger cleanup map and binds current
part/value pairs in `src/ui/tabs.ts`. Dialog tracks generated title/description IDs and updates only
its owned associations before the already-enhanced shortcut in `src/ui/index.ts`. Authored ARIA and
one-time native bindings remain intact. The new `test/ui-tabs-dialog-lifecycle.test.ts` adds 11
cases, with corresponding component/ownership/testing contract updates. The root integration follows
completed predecessor delivery and root Plan validation.

The isolated verification follow-up removes Editable's unused placeholder cleanup callback, makes
the private construction-time cleanup optional and preserves exact native callback release. Root
coverage failure is retained; no unreachable initializer test or coverage threshold change is added.

`src/ui/countdown.ts` resolves current output/status parts before controller reuse and registers a
still-running retained controller with the shared clock on enhancement. Private duration/remaining/
completion bookkeeping names keep the bundle within existing limits. The new
`test/ui-countdown-lifecycle.test.ts` has ten cases. The same component/ownership/testing guides
record current-part and deferred clock ownership. This correction is now integrated after the
predecessor full run terminated and the root Plan passed validation.

`src/ui/disclosure.ts` captures the exact summary in its native listener cleanup.
`src/ui/editable.ts` retains the controller while refreshing current parts, releases old keydown
bindings, preserves draft/committed state and applies mode to current DOM. Private record fields use
concise names, while the public event field remains `control`. The new
`test/ui-disclosure-editable-lifecycle.test.ts` adds 14 cases. `quality/lint-boundaries.json`
reduces JSON Viewer's redundant-condition allowance from three to two. The same three guides record
current part semantics and verification boundaries.

`src/ui/json-viewer.ts` now updates current source/tree/status references, invalidates rendering
when a part changes and normalizes empty source text before cache comparison. `src/ui/log-viewer.ts`
retains its controller across replacement, releases exact old native bindings, refreshes current
parts and rechecks live pause/follow state in deferred scrolling. Private record names and
equivalent JSON record assignment keep the implementation within the existing size contract. The new
`test/ui-viewer-lifecycle.test.ts` has 19 cases; 17 fail original source, and the corrected focused
viewer set passes all 32 cases. The same component/ownership/testing guides record the guarantees.

Number Field now validates current native parts before reusing a controller, releases all four old
native listeners before part replacement, and names its change callback for exact removal. Its
redundant string-conversion branch is simplified without changing native normalization. Five new
cases extend `test/ui-number-field.test.ts`; four replacement paths fail original code, while the
unchanged-controller case and three original cases pass.

The pending-reset correction adds a current-record check to queued reset callbacks in
`src/ui/rating.ts`, `src/ui/color-picker.ts` and `src/ui/time-picker.ts`. Six additional cases in
`test/ui-rendered-parts-lifecycle.test.ts` cover replaced controls and unchanged live controllers.
Original code fails the three replacement cases while all ten existing/control cases pass.

The rendered-part follow-up also changes `src/ui/file-upload.ts` to bind cached rendered output to
its current list element, and `src/ui/multi-select.ts` to include option metadata/disabled state in
tag caching, invalidate a replaced tags element, and release the old active record before replacing
its controller. `test/ui-rendered-parts-lifecycle.test.ts` adds seven regressions; all seven fail
against the original behavior. The test covers both native and fallback floating cleanup and retains
a before-close veto to prove structural cleanup still releases the old owner.

The native-form follow-up changes `src/ui/search-field.ts`, `src/ui/rating.ts`,
`src/ui/color-picker.ts` and `src/ui/time-picker.ts` to retain and compare current form identity,
and `src/ui/file-upload.ts` and `src/ui/multi-select.ts` to release a captured form binding.
`test/ui-form-ownership.test.ts` adds 41 public enhancement/listener regressions and controls. The
original six-source behavior fails 25 cases and passes 16; Select and Combobox controls pass. The
earlier temporary Plan copy command failed before editing because it resolved the temporary checkout
as its source; the actual corrected Plan extension was then validated before source edits.

The integrated earlier UI correction changes `src/ui/password-field.ts` (replacement-part listener
handoff), `src/ui/chart.ts` (rendered-part identity and canceled-render retry),
`src/ui/clipboard-write.ts` (temporary DOM cleanup), the three corresponding `test/ui-*.test.ts`
files, and this ticket. `docs/COMPONENT_ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md` and
`docs/TESTING.md` describe the corrected behavior in the root checkout. Original ledger rows below
describe earlier completed work.

The behavior follow-up changes `src/runtime.ts` to close setup registration after destruction and
release detached mounts, and adds `test/behavior-lifecycle.test.ts` for the public regression paths.
Its public and brain contract updates belong in `README.md`, `docs/ARCHITECTURE.md` and
`docs/RUNTIME_OWNERSHIP.md`; owner 0033 and the roadmap retain the incomplete final-audit boundary.

| File                                                                                                  | Purpose                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/errors.ts`                                                                                       | Shared one-error-or-aggregate reporting and continue-after-failure helper.                                                               |
| `src/reactivity.ts`                                                                                   | Effect owners/error sinks, failed-initial-run rollback, complete-batch scheduling, and barrier-visible unowned failures.                 |
| `src/kernel.ts`                                                                                       | Application lifecycle records, owned observers, render transactions, deepest-first destruction, operation IDs, and enhancement barriers. |
| `src/runtime.ts`                                                                                      | Transactional behavior-app construction, owned effects/observer/timers, exact-once subtree cleanup, and atomic commit rollback.          |
| `src/declarative.ts`                                                                                  | Transactional declarative construction, directive listener/effect rollback, owned observer, and aggregated teardown.                     |
| `src/patch.ts`                                                                                        | Owner-document parsing, kernel transaction hooks for every patch mode, nested-root cleanup, and `data-jqs-preserve`.                     |
| `src/types.ts`                                                                                        | Public `StarStatic.whenEnhanced()` declaration.                                                                                          |
| `test/reactivity.test.ts`                                                                             | Initial failure rollback plus owned and unowned scheduled-effect containment.                                                            |
| `test/runtime.test.ts`                                                                                | Setup rollback, exact-once failing cleanup, owned effect continuation, and debounce-timer teardown.                                      |
| `test/declarative.test.ts`                                                                            | Request rollback and continue-after-failure directive teardown.                                                                          |
| `test/kernel.test.ts`                                                                                 | Deepest-first render ownership and application-observer ledger release.                                                                  |
| `test/patch.test.ts`                                                                                  | Nested app removal, explicit preservation, and directive/UI barrier integration.                                                         |
| `test/fetch.test.ts`, `test/datastar-sdk.test.ts`                                                     | HTML, raw SSE, and official-SDK patch paths use the enhancement barrier.                                                                 |
| `e2e/fixtures/runtime.ts`, `e2e/quality-contracts.spec.ts`                                            | Real-browser render transaction, connected cleanup order, MutationObserver, directive, and ARIA proof.                                   |
| `quality/public-baseline.json`, `etc/jquery-star.api.md`                                              | Reviewed `whenEnhanced` public-surface addition.                                                                                         |
| `vite.config.ts`, `package.json`, `package-lock.json`                                                 | Production minifier configuration and its build-only dependency keep lifecycle code inside fixed bundle budgets.                         |
| `README.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/README.md` | Public API, topology, retained-state, and project-brain lifecycle contracts.                                                             |
| `example/docs/api/index.html`, `example/docs/datastar/index.html`                                     | Website API and Datastar lifecycle guidance.                                                                                             |
| `docs/tickets/0006-make-lifecycle-transactional.md`                                                   | Live Plan → Code → Test → Document evidence.                                                                                             |

### Ownership correction changed files (2026-09-06)

The coverage follow-up adds `test/fetch.test.ts` assertions for nested pending/error state during a
real public action dispatch and after its 204 response. All fourteen backend-action tests pass, with
replacement, missing intermediates and preserved siblings observed through application state.

Package-size follow-up: `src/value-checks.ts` now owns recursive state copying. Behavior and
declarative applications and signal patches import it; requests and patches share its plain-record
predicate. `src/declarative.ts` omits absent boolean event flags and normalizes native listener
options to explicit booleans. `test/value-checks.test.ts` checks isolation, sparse holes, atomic
identity, null-prototype input, enumerable keys and accessor errors. `docs/ARCHITECTURE.md`
describes the shared implementation. Focused, installed-package and complete delivery results are
pending.

| File                                                                                      | Purpose                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/request-lifecycle.test.ts`                                                          | Public core/application request ownership matrix with actual controlled fetch settlement, shared and independent controllers, both application modes and cleanup owners. |
| `test/runtime.test.ts`                                                                    | Assert replaced/fired debounce records are released before action invocation and reentrant scheduling.                                                                   |
| This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/tickets/ROADMAP.md` | Record the reopened scope and authoritative progress.                                                                                                                    |

The built-in correction additionally changes `src/declarative.ts` to stop effects whose first
callback released the application, before retaining the runner or installing model handlers.
`test/directive-application.test.ts` adds public helper/native-event failure cases, active controls
and the already fixed registered-directive control. README and ownership/testing guidance describe
that lifetime boundary.

The ownership correction also changes `src/fetch.ts` to count active requests per root/controller
and `src/runtime.ts` to release replaced/fired debounce records before invoking actions.
`README.md`, `docs/BACKEND.md`, `docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md` document the
shared-controller boundary, timer lifetime and exact regression scope.

### Design changes

Application observers now enter the kernel resource ledger during construction and expose an
idempotent release handle to their application. Setup uses that handle during rollback; committed
applications use it during destruction. Application-local jQuery namespaces, effects, mounts,
directives, requests, and timers remain directly enumerable or root-cancelable records rather than
pretending the kernel can discover them.

The kernel stores an optional subtree-lifecycle capability beside each application. A render
transaction removes outgoing application records before invoking destruction, sorts them by DOM
containment deepest-first, then asks surviving owner applications to release the exact outgoing
subtree. Cleanup errors are retained while the DOM mutation continues and are reported after commit
with the operation ID.

MutationObservers remain the single incoming-content scanner. The transaction registers its barrier
before a possible View Transition callback, then waits through observer delivery and two reactive
turns. This avoids a competing synchronous scan that would execute `data-init`, directives, or mount
behavior twice. `whenEnhanced()` waits all registered transactions and consumes any reactive
failures; `nextUpdate()` remains the reactive-only primitive.

`data-jqs-preserve` prevents Idiomorph from morphing/removing its subtree. Direct replacement or
removal skips a target containing the marker because moving it to another parent would change
application ownership. Existing `data-ignore-morph` behavior remains separate.

Behavior debounce timers gained an enumerable application ledger so teardown can cancel them.
Declarative event/model/effect setup rolls its newly created resource back if replacing an older
cleanup fails. Failed initial effects remove their dependencies before throwing the setup error.

## Test

### September 23 Sortable native drag transaction boundaries

`npx vitest run test/ui-sortable-document.test.ts` passes 90 cases, including eight new native-drag
cases across same and foreign Documents. `npm run typecheck`, focused ESLint and Prettier pass. The
existing trusted Sortable drag passes three selected desktop browser projects with zero retry.
Standalone `npm run test:coverage` executes its unit suite and fails the unchanged delivery floor:
54 changed-code checks in 34 files, 877 uncovered changed lines and 63 functions. Sortable falls
from 84 to 62 uncovered lines and from eight to two functions. A first browser command used invalid
project names and was corrected to the repository's `desktop-*` names before the passing run.
Exact-tree fast report `2026-09-24T02-19-05-914Z-66609/report.json` passes all six lanes and 5,059
units. Full `npm run check` report `2026-09-24T02-21-51-421Z-81002/report.json` starts and ends on
the same 933-file fingerprint `d7546e2e72717d62505fcd145e7904d279e1e81dd8a7cc6f8d8db280e66c49a3`. It
passes 5,059 units, property, self-hosted, release and all 1,717 browser cases across eight
projects, including 563 per desktop engine without failure, retry or skip. Coverage fails 54
changed-code checks in 34 files, with 877 uncovered lines and 63 functions. Package quality reports
3,417,651 packed bytes against 3,174,000 allowed, a 558,894-byte Mobile UMD against 462,311
reviewed, and a 634,769-byte installed root against 542,720. Package-budget is the sole failed
detector of sixteen. This full run also rejected an unformatted umbrella ticket and an owner-ticket
spelling word added after the passing fast report; both are corrected in the final documentation
revision. A final fast report verifies that revision. No source correction was needed and no
delivery receipt is eligible.

### September 23 external native floating state and refresh

Full `npm run check` report `2026-09-24T01-32-50-157Z-66628/report.json` starts and ends on matching
933-file fingerprint `31898c4b02097f34d19a0f60e3fa2ba96df0c68c4b5fb76284948460f757c8de`. Format,
5,051 units, property, static, self-hosted, release and all 1,717 browser cases pass across eight
projects, including 563 per desktop engine without failure, retry or skip. Coverage fails 54 checks
in 34 files, with 899 uncovered changed lines and 69 functions. Packed bytes 3,417,476, Mobile UMD
558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget is the sole failed
detector control of sixteen; no delivery receipt is eligible. This ticket remains coding.

Fast report `2026-09-24T01-29-32-040Z-52009/report.json` passes all six lanes and 5,051 units on
matching 933-file fingerprint `1b62fc07d0ec35753b2a7e450f858ebef9ca3788ff1f446dc18870d733533b88`.
Owner 0006 and umbrella 0033 pass Code-phase validation against it. The subsequent ticket evidence
edit will be included in the full delivery input.

The complete shared floating resource suite passes 122 tests. TypeScript and focused ESLint pass.
The selected real-browser case passes in Chromium, Firefox and WebKit for external native hide/show,
reflected state, trigger ARIA, no duplicate notifications and outside dismissal. Standalone
delivery-mode coverage retains 54 failed checks in 34 files, while uncovered changed lines fall from
937 to 899 and functions from 73 to 69. The fast and full results are recorded above; fixed package
and wider audit criteria remain open.

### September 23 Form and native Menu interaction evidence

Full `npm run check` report `2026-09-23T23-55-50-488Z-65952/report.json` starts and ends on matching
933-file fingerprint `48c097feb1b0674803d45bc65c7341f3429fac463b12c01a2dc5a85c7169951d`. Format,
5,038 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage retains 75
failures in 35 files, with 937 uncovered changed lines and 73 functions. Packed bytes 3,417,197,
Mobile UMD 558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget isolation
is the sole failed detector control among sixteen; no delivery receipt is eligible. This ticket
remains coding.

The original-resolver `.git/jqstar/form-clear-errors-original-negative.log` fails one public case:
`ui.form.clear-errors(input, ["email"])` resolves to the nearby form and clears server validity
instead of rejecting the explicit wrong-kind input. The corrected three-suite selection passes 29
tests; TypeScript, focused ESLint and the lint-boundary ratchet pass. The selected real-browser case
passes once in Chromium, Firefox and WebKit without retry or skip. Its assertions cover unchanged
native custom validity, authored and native disabled Menu focus, ContextMenu-key invocation and
canceled touch long-press. The native toggle unit case checks external popover state and
`aria-expanded`. Standalone delivery-mode coverage retains 75 failures across 35 changed source
files, while uncovered changed lines fall from 965 to 937 and functions from 77 to 73. The fast and
full results are recorded here; fixed package and wider audit criteria remain open.

### September 23 structural explicit-action evidence

Full `npm run check` report `2026-09-23T23-00-43-821Z-58338/report.json` starts and ends on the same
933-file fingerprint `c0b92ce1edaf173a30e021c8af8eeef7158b675c86ce1e51af8930eabdd6444b`. Format,
5,031 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage fails 75
changed-code checks in 35 files, with 965 uncovered lines and 77 functions. Packed bytes 3,417,139,
Mobile UMD 558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget isolation
is the sole failed detector control of sixteen; no delivery receipt is eligible. This ticket remains
coding.

The original-source `.git/jqstar/five-action-targets-negative.log` fails eight direct cases across
six component suites; `.git/jqstar/toggle-press-negative.log` fails the separate non-button press
overload. The corrected six-suite run passes 46 tests. TypeScript and focused ESLint pass. The
selected browser case passes in Chromium, Firefox and WebKit without retry or skip, checking
wrong-kind rejection, unchanged native state and matching-root controls. Standalone delivery-mode
coverage still fails 75 checks across 35 changed source files, but uncovered changed lines fall from
974 to 964 and functions from 79 to 77. The exact-tree fast and full results are recorded above.
Full ticket acceptance remains open.

The first fast report `2026-09-23T22-53-42-349Z-29482/report.json` passes five lanes but its unit
lane fails one release-hardening test: API Extractor records the existing `StarPluginRegistrar`
warning at Dialog line 670 while the checked-in report says 667. A diff of the generated and
checked-in reports shows only that line reference. The Plan ledger now includes the generated
snapshot; the passing repeat fast run is recorded below.

The repeat `npm run quality:fast` report `2026-09-23T22-57-30-642Z-43847/report.json` passes all six
lanes and 5,031 units on matching 933-file fingerprint
`91d719c848c312248d9c1a40fd215c838d6ede3ac4c763c4422d2cb82594d555`. The full `npm run check` result
is recorded above.

### September 23 additional explicit-action evidence

Full `npm run check` report `2026-09-23T22-05-28-440Z-41196/report.json` starts and ends on matching
933-file fingerprint `c1c0bfe1a18acaa65107e2cb21080005d19f21e8f942b4dfa14c31f1042f5202`. Format,
5,022 units, property, static, self-hosted, release and all 1,711 browser cases pass across eight
projects, including 561 per desktop engine without failure, retry or skip. Coverage fails 75
changed-code checks across 35 files. Package quality reports packed bytes 3,417,612 against
3,174,000, Mobile UMD 558,929 against 462,311 reviewed bytes, and installed root bundle 634,857
against 542,720. Package-budget is the sole failed detector control of sixteen; no delivery receipt
is eligible. Direct comparison with unchanged `config/quality-budgets.json` also shows masked
unpacked, UI ESM/CommonJS, raw UMD and CSS caps. This ticket remains coding.

The original-source `.git/jqstar/eleven-action-targets-negative.log` records 13 failed public cases
across eleven suites: ten wrong-kind element actions redirect to the nearby controller, and Tree,
Carousel and File Upload misclassify matching native-root/value calls. The corrected selected run
passes all 13, and the complete eleven-suite run passes 87. `npm run typecheck` and focused ESLint
pass. The selected browser case passes in Chromium, Firefox and WebKit without retry or skip,
checking native form, tree, tab, carousel, file input and popover state. Full standalone
`npm run test:coverage` executes the inventory: 75 changed-code failures remain across 35 files,
while uncovered changed lines drop from 985 to 974 and uncovered functions from 81 to 79. Fast
report `2026-09-23T21-59-09-250Z-12003/report.json` passes all six lanes and 5,022 units on matching
933-file fingerprint `581e01a9ea5ba568112b70bdd4bec0853f0f85faa12e26c6c4bbe8fc1df50724`. Full
delivery failures above and the other fixed-package/coverage blockers remain open.

### September 23 remaining explicit-action evidence

Full `npm run check` report `2026-09-23T21-10-29-609Z-23479/report.json` has matching start/end
933-file fingerprint `a9095ecf9e13991ecffea94cf358196e942f945eb43c86ca53e74214d5c68a5b`. Format,
5,009 units, property, static, self-hosted, release and all 1,708 browser cases pass across eight
projects; each desktop engine passes 560 without failure, retry or skip. Coverage remains red with
75 changed-code failures across 35 files. Packed bytes (3,417,751), Mobile UMD (559,168 versus
462,311) and installed root bundle (635,321 versus 542,720) exceed fixed limits. Package-budget
isolation is the sole failed detector control of sixteen. The report has no eligible delivery
receipt; this ticket remains coding.

Fast report `2026-09-23T21-07-02-306Z-8804/report.json` passes all six lanes and 5,009 units on
matching 933-file start/end fingerprint
`4bfa78d79e38e6515c25be13dc078ef0c7e560f4d04c4718ffbff832bbe824b2`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; the full delivery result is recorded above.

The original-source `.git/jqstar/six-action-targets-negative.log` records six failed public
wrong-kind element actions; `.git/jqstar/message-follow-negative.log` records the separately failed
matching root `follow(root, false)` overload. The corrected six-suite selection passes 43 tests.
TypeScript and focused ESLint pass. The selected browser case passes in Chromium, Firefox and WebKit
without retry or skip, checking native form, disclosure, log, pagination, scroller and timer state.
Full standalone delivery-mode `npm run test:coverage` executes the inventory and reduces
changed-code failures from 76 to 75 across the same 35 changed source files. Other changed-code and
fixed package blockers remain open.

### September 23 Color Picker and Editable target evidence

Full `npm run check` report `2026-09-23T20-20-59-893Z-21133/report.json` has matching start/end
933-file fingerprint `598e998e4ce4b3a89a218ec57179f32222559f6911c71e03448030173f274740`. Format,
5,002 units, property, static, self-hosted, release and all 1,705 browser cases pass, including 559
per desktop engine without failure, retry or skip. Coverage fails 76 changed-code checks in 35 of 60
changed source files. Packed bytes (3,417,931), Mobile UMD (559,332) and the installed root bundle
(635,618) exceed fixed limits. Package-budget is the only failed detector control among sixteen, and
no delivery receipt is issued. Owner 0006 remains coding with other changed-code and fixed-package
work open.

Fast report `2026-09-23T20-17-52-346Z-6504/report.json` passes all six lanes and 5,002 units on
matching 933-file start/end fingerprint
`46816f1495c82ec2515ddb1ed8017cf9bec507ca39048e4e35ea13181b50ef4c`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; full delivery is still required.

The original-source selection `.git/jqstar/color-editable-negative.log` records two failed public
wrong-kind element actions. The corrected two-suite selection passes 21 cases; the four related
suites pass 266. TypeScript and focused ESLint pass. The first lint-boundary ratchet run found one
new non-null assertion in the Color Picker test; an explicit fixture guard replaced it and the
unchanged ratchet passes. Full standalone delivery-mode `npm run test:coverage` executes the
inventory and reduces changed-code failures from 77 in 36 files to 76 in 35. Color Picker clears;
Editable retains four defensive stale-controller entry guards. The selected actual-browser case
passes once in Chromium, Firefox and WebKit without retry or skip. Exact-tree fast and full delivery
remain required, with fixed package and other changed-code blockers open.

### September 23 Password Field and Sidebar target evidence

The corrected full `npm run check` report `2026-09-23T19-21-50-667Z-9825/report.json` has matching
start/end 933-file fingerprint `b7d5f872fc12f13592c448f34bf7ad835252191e7c2fd5164d39c46de685865a`.
Format, 4,991 units, property, static, self-hosted, release and all 1,705 selected browser cases
pass, including 559 per desktop engine without failure, retry or skip. Coverage fails 77
changed-code checks in 36 of 60 changed source files. Packed bytes (3,418,078), Mobile UMD (559,386)
and the installed root bundle (635,716) exceed fixed limits; package-budget is the only failed
detector control among sixteen. No delivery receipt is issued. The preceding full report
`2026-09-23T18-44-45-373Z-42853/report.json` also measured these blockers, but caught three
unformatted audit paragraphs added after the fast run. Prettier and `npm run format:check` corrected
that avoidable failure before the repeated full run.

The combined lifecycle and Password Field/Sidebar tree passes all six `npm run quality:fast` lanes
and 4,991 units in `2026-09-23T18-41-43-096Z-28287/report.json`. Its start and end fingerprint match
at 933 files and `5b15e06b338a7bfaab9bd27e1edd54273f1fb63cef17a6a3e004eb7104aa3786`. Owner 0006 and
umbrella 0033 pass Code-phase validation against that report. The full delivery gate remains
required.

The original-source focused run `.git/jqstar/password-sidebar-negative.log` records two failed
public wrong-kind element cases and 13 passing controls. The corrected two-suite selection passes 20
tests. One Sidebar test initially opened by facade and expected trigger focus on backdrop close;
only trigger-opened sidebars have a return target. It was corrected to use the documented trigger.
The storage reentry test initially retained an authored `data-value`, correctly bypassing storage;
removing it exercised the intended callback and the test passed. The first focused ESLint run found
three redundant boolean comparisons in the browser fixture; those expressions were simplified, and
TypeScript, focused ESLint and the unchanged lint-boundary ratchet pass. Full standalone
delivery-mode `npm run test:coverage` executes its inventory and reduces changed-code failures from
80 across 37 files to 77 across 36; Password Field clears and Sidebar retains one defensive
stale-controller line. The selected actual-browser case passes once each in Chromium, Firefox and
WebKit with no retry or skip. Exact-tree fast and full delivery remain required, with other coverage
and fixed package blockers open.

### September 23 shared lifecycle and preserved-focus evidence

The two focused suites pass 41 tests. TypeScript, focused ESLint and the unchanged lint-boundary
ratchet pass. Full standalone delivery-mode `npm run test:coverage` executes its inventory and
reduces changed-code failures from 81 to 80 across the same 37 source files. The tested reset,
double-error and preserved-focus branches clear. `src/ui/lifecycle.ts` still reports its default
no-op cleanup function as uncovered; `src/kernel.ts` still reports an uninitialized class field as
runtime-emitting but absent from V8 maps. These are not evidence of an untested user-visible path,
and this wave does not manufacture calls or alter code only to satisfy those entries. Exact-tree
fast and full delivery remain required; all other coverage, package and program blockers remain
open.

### September 23 native value-action and coverage evidence

The original-source focused selection records five failed element-target cases and 21 passing
controls in `.git/jqstar/native-value-actions-negative.log`. After the five controller corrections,
the five focused suites pass 39 tests. TypeScript, focused ESLint and the unchanged lint-boundary
ratchet pass. Standalone delivery-mode `npm run test:coverage` executes its full suite and reduces
changed-code failures from 87 across 39 files to 81 across 37. Search Field and Tags Input clear;
Input OTP retains one runtime-emitting line absent from coverage maps, Stepper two uncovered lines,
and Multi Select its remaining state/keyboard/part paths. The selected actual-browser case passes
once each in Chromium, Firefox and WebKit with no retry or skip. A Stepper test initially used
`disabled` where the public step state is `data-disabled`; the corrected test passes and the failed
fixture result remains in the local focused-run evidence. Exact-tree fast and full delivery remain
required, with the other coverage and fixed package blockers still open.

Fast report `2026-09-23T17-35-10-849Z-13542/report.json` passes all six lanes and 4,980 units on
matching 933-file fingerprint `058b6e5997c8733f2b0694d9db4bcfcd30d8a78ae266f7e733a180b2d84acf76`.
Owner 0006 and umbrella 0033 pass Code-phase validation against that report. Full `npm run check`
remains required and the fast result alone does not close lifecycle or program acceptance.

Full `npm run check` report `2026-09-23T17-38-59-853Z-28268/report.json` starts and ends on matching
933-file fingerprint `216b3cd48bcc4d3e06bd9943f7b31e780202c394e37369f04703ef47c6c884e9`. Format,
4,980 units, property, static, self-hosted, release and all 1,705 browser cases pass. Each desktop
engine passes 559 cases without failure, flake or skip. Coverage executes its tests but fails 81
changed-code checks across 37 of 60 changed source files. Package quality fails the unchanged packed
(3,417,532), Mobile UMD (559,441) and installed root bundle (635,815) limits. Package-budget
isolation is the sole failed detector control among sixteen. The run issues no delivery receipt;
remaining coverage, fixed size limits and wider audit criteria keep this ticket in coding.

### September 23 native-control action and coverage evidence

The five public action negatives failed before source correction while 24 existing controls passed.
The corrected 44-case focused selection, TypeScript and focused ESLint pass. Targeted V8 coverage
hits every previously missed changed line in the five files. Full delivery-mode
`npm run test:coverage` executes the suite successfully and reduces changed-code failures from 93
across 44 files to 87 across 39; the five targeted sources have no remaining changed-code coverage
failure. The selected actual-browser action case passes once each in Chromium, Firefox and WebKit,
checking native values, toolbar focus, an implicit action and mismatched-target rejection. The
remaining coverage and fixed package blockers still require a complete delivery result.

The first fast report `2026-09-23T16-28-46-755Z-98207/report.json` passes units and formatting but
fails static lint-boundary accounting because five test files introduced 1–4 non-null assertions
each. Replace only the new assertions with explicit fixture presence checks; do not raise the
allowance. The corrected 44-case focus and `check-lint-boundaries.mjs` both pass. A new fast report
must replace that failed checkpoint before Code-phase validation.

Fast report `2026-09-23T16-32-48-871Z-13629/report.json` passes all six lanes and 4,962 units on
matching 933-file fingerprint `4a9521d58b2efb5fb74a119d6fdca61b71af6418dc71744b1b7314941934c24e`.
Owner 0006 and umbrella 0033 pass Code-phase validation against that report. Complete delivery is
next; this fast result alone does not close lifecycle or program acceptance.

Full `npm run check` report `2026-09-23T16-37-46-727Z-28545/report.json` starts and ends on matching
933-file fingerprint `49226d997b79b2ac335a31c475aa820eb04c223570d72c1ef5407182e0b74274`. Format,
4,962 units, property, static, self-hosted, release and all 1,705 browser cases pass. Each desktop
engine passes 559 cases with no failure, flake or skip. Coverage executes its tests but fails 87
changed-code checks across 39 of 60 changed source files; the five targeted files clear. Package
quality fails the unchanged packed (3,417,336), Mobile UMD (559,527) and installed root bundle
(636,018) limits. Package-budget isolation is the only failed detector control among sixteen. The
run issues no delivery receipt; the remaining coverage, fixed size limits and wider audit criteria
keep this ticket in coding.

### September 23 changed-code coverage evidence

The three focused files pass 128 tests. TypeScript, focused ESLint and formatting pass. The
standalone delivery-mode `npm run test:coverage` report in `test-results/quality/coverage-gate.json`
executes its full test inventory and reduces changed-code failures from 96 across 47 files to 93
across 44 files. Clipboard write, floating ownership and Pagination have no remaining changed-code
coverage failure. Global floors and the threshold ratchet remain unchanged. This standalone run
still fails on the other 44 changed files; fast and full delivery remain necessary for an exact-tree
result.

Fast report `2026-09-23T14-33-47-425Z-41290/report.json` passes all six lanes and 4,942 units on
matching 933-file start/end fingerprint
`80b36bfc5ae534c6907e4b453f9fdf8c9278d0c0e36715666247a36577720056`. Owner 0006 and umbrella 0033
pass Code-phase ticket validation against that report. Full delivery is next.

The corrected full `npm run check` report `2026-09-23T15-12-21-834Z-21004/report.json` starts and
ends on the same 933-file fingerprint
`351d1d9da3efe73ae7446a8ddcc83bd85ff094214856e698d3fd32df37ae2627`. Format, 4,942 units, property,
static, self-hosted and release gates pass. All 1,702 browser cases pass across eight projects, 558
per desktop engine, with no failures, flakes or skips. Changed-code coverage remains red on 93
checks across 44 of 60 changed source files. Package quality fails fixed packed bytes (3,416,696),
Mobile UMD (559,623) and installed root bundle (636,122) limits. The package-budget detector
isolation control fails because the baseline already violates that budget; its other fifteen
controls pass. No delivery receipt or full lifecycle closure follows. The first full run
`2026-09-23T14-37-34-807Z-55986/report.json` also found a formatting error in the new result
paragraphs; Prettier corrected it before this final run.

### September 23 plain nested-application evidence

The new direct negative failed in both boot orders before the runtime correction. The first fast run
then exposed three page-wide boot failures, which the narrowed rule corrects. All six direct cases
and 51 focused core/CSP/patch cases pass; TypeScript and focused ESLint pass. The rebuilt bundle
passes 24 single/nested backend cases and the combined 90-case host selection across three desktop
engines without retry or skip. Each nested case checks outer `{ outer: 100 }` state, child request
state and one action across actual Turbo/htmx replacement. Plan validation passed before fixture
edits. Temporary nested no-bridge variants for Turbo 8.0.21 and htmx 2.0.0 render their host result
but fail with the outgoing application still live after native removal. Full delivery and the
named-component explicit-boot case remain open.

The nested-slice fast report `2026-09-23T13-32-36-307Z-32671/report.json` passes 4,933 units and all
six lanes; Code-phase validation passes for owners 0006/0016, umbrella 0033 and downstream 0036/0037
on that exact tree. Full `npm run check` report `2026-09-23T13-35-36-553Z-47216/report.json` starts
and ends on the same 932-file fingerprint
`eb2d4ad1d3e82795c5638312de882c20f67f24bdf1d264949c0aea4e2073cb83`. It passes all 1,702 browser
cases across eight projects, including 558 per desktop engine, without failures, flakes or skips.
Changed-code coverage reports 96 failures across 47 of 60 changed source files; `src/declarative.ts`
itself has no uncovered changed executable line or function. Package quality fails packed bytes
(3,416,436), Mobile UMD (559,623) and installed root bundle (636,122) against unchanged limits.
Fifteen detector controls pass; package-budget isolation cannot distinguish its injected failure
from those three baseline failures. No delivery receipt or full lifecycle closure.

### September 22 core document-retention evidence

The ignored core-only probe passes three sequential runs: 39 of 39 Documents collect on first GC and
39 fixture controls pass. The tracked combined command passes one initial and three repeat runs: 104
UI and 39 core exercises, 247 of 247 disposed Documents collected on first Chromium GC, with the
weakly referenced control collected and held control retained. Injected strong references to either
the first UI Document (`resizable`) or first core Document (`core/idle`) make the combined command
exit nonzero with the retained family named. A parallel ignored probe attempt failed Vite port
allocation and is excluded. Negatives regenerated from the final tracked script also fail for UI
`resizable` and `core/idle`. Focused Node syntax, ESLint and complete TypeScript pass. The expanded
927-file tree passes 4,927 units and all six fast/23 static gates in
`2026-09-23T04-25-39-616Z-78632/report.json`, with identical start/end fingerprint
`e2d1032a7c31587978b28438e09ad469db6ddd01d435183526be042e4c7df588`.

`npm run check` on that same unchanged fingerprint finishes in
`2026-09-23T04-28-38-245Z-93163/report.json`. Browser quality passes 1,642 cases across eight
projects with zero failures, flakes or skips; ticket workflow, runner, resource dependency, format,
unit, property, static delivery, self-hosted and release gates pass. Coverage fails 96 changed-code
checks across 59 inherited changed source files, despite passing test execution, roster and
threshold-ratchet controls. Package quality fails packed bytes (3,412,820 versus combined fixed
allowance), Mobile reference UMD (559,198 versus 462,311) and installed root bundle (635,719 versus
542,720). The 16-check detector passes 15 checks; package-budget isolation fails because those three
package failures coexist with the sabotage. No delivery receipt or full lifecycle acceptance.

### September 22 document-retention measurement evidence

`node test/document-retention-browser.mjs` passes four consecutive public runs. Each exercises 104
fixture cases, including one for all 50 families and all six modes for nine active-record families,
and collects all 208 disposed Documents on the first explicit Chromium GC. The weakly referenced
control collects and the strongly held control remains. The ignored 50-family prototype passed three
additional repeats. An ignored injected-strong-reference negative fails with the retained
`resizable` Document, proving the detector's failure path. `node --check`, complete TypeScript and
focused ESLint pass after the tracked script is formatted. This is bounded source-fixture evidence;
generic kernel/non-UI documents, other browser heaps and long-run profiles remain open. Run full
fast/static on the documented tree; the earlier `npm run check` failure is historical after this
tracked addition.

### September 22 Menubar selector evidence

The saved pre-correction `menubar-selector-public-negative.log` has four failures and one passing
control: local `#tools`, two-argument class target, facade selector after an unrelated match and
invalid target error. The saved `menubar-selector-missing-target-negative.log` has one failure and
six controls: an absent first argument in a two-argument local action opened the local menu. The
corrected seven-case selector suite and 59-case Menubar/Menu/document selection pass. Type checks
and focused ESLint passed before the last source/test extension; repeat them. The new native
document case passes in Chromium, Firefox and WebKit. The first complete browser run was interrupted
after the missing-target finding and is not accepted evidence. Complete source/browser/fast and
delivery evidence is still required; the prior Data Table checkpoint became historical when Menubar
source changed.

The corrected 926-file checkpoint passes `npm run quality:fast` with 4,927 units, all six fast and
23 static gates (`2026-09-23T02-40-48-615Z-16901/report.json`). The complete selected browser cohort
passes 1,248 cases, 416 per Chromium/Firefox/WebKit, with zero skips, flakes or errors.
`verify-menubar-selector.mjs` binds exact source hashes and fingerprint
`da0c1aba560ac19180d160e52fbfabdb3c11bf9100ea584bcd3f81bb9317afe2`, 3,502 integration assertions in
113 files, all-entry build outputs, 108 source-map sources/293 contents, twelve unchanged API
reports and 262 declaration outputs. `npm run ticket:validate -- --phase code` passes against that
report. The actual Turbo/htmx baseline adds 30 passes, ten per engine, on the same source. This is
bounded Menubar evidence, not full host or package acceptance.

The isolated build still exceeds fixed ceilings by 774 CSP gzip, 1,089 core gzip, 1,203 CSP Brotli,
870 stores gzip, 92,999 root raw, 92,002 UI ESM, 90,310 UI CommonJS and 94,302 UMD bytes. No ceiling
or allowance was raised. Installed package, generic/UI host matrix, heap, coverage, manual
accessibility and complete delivery remain open. Later documentation edits make the source
checkpoint historical for final delivery.

The documented tree passes `npm run quality:fast` again with 4,927 units, six fast/23 static gates
on 926 files (`2026-09-23T03-06-24-632Z-37701/report.json`). `npm run check` starts and ends on
fingerprint `f0db70bb8f12fdcc7a3cc99bc616793cd6b54a385da6d41f09620f8ea68d1cd0` but fails coverage,
package quality, browser quality and the ticket 0044 detector self-test
(`2026-09-23T03-09-05-459Z-52070/report.json`). Coverage has 96 changed-code failure entries in 59
inherited changed files; its fixed threshold ratchet, production roster and evidence mapping pass.
Package quality passes API, installed module/type, QUnit and browser-consumer checks, but fails
packed bytes 3,412,820, UMD actual 559,198 versus reviewed 462,311, and installed root bundle
635,719 versus fixed 542,720. Release quality, property, static delivery and self-hosted gates pass.
No delivery receipt is issued.

The delivery browser gate executed zero tests because orphaned fixture servers from the earlier
interrupted run occupied ports 4174–4179. After those orphaned processes were removed, standalone
`npm run test:browser:quality` passes all 1,642 cases across eight projects on the same documented
fingerprint, with zero skips, flakes or errors. The detector self-test rerun confirms its retry-pass
fixture passes with clean ports; only the package-budget fixture remains red because three existing
package checks fail where the fixture expects one isolated failure. These independent results do not
override the failed `npm run check` report. Subsequent ledger edits require a fresh fast report.

### September 22 Data Table cost evidence

The saved public negative `data-table-cost-public-negative-second.log` has four failures and one
native-page control: 12/24 rows cause 1,032/3,504 row-text reads during initial/repeated enhancement
and 1,776/5,856 reads during a page action; the 24-row page makes 500 whole-root selector queries.
The first correction passes 125 focused cases, but two new synchronous status-write probes expose
one-call invalidation followed by a stale page notification. The saved
`data-table-cost-reentry-focused.log` has 125 passes/two failures. Latching invalidity corrects that
gap. An observer-cleanup test initially leaves an invalid fixture for the global enhancement
observer, causing one unhandled test error; restoring the fixture after the expected throw fixes the
test without changing runtime behavior.

The first cost-focused run `data-table-cost-final-focused.log` passes 129 cases in four suites with
no unhandled errors. A source-bound diagnostic records initial row reads at 24/48 for 12/24 rows,
page reads at 36/72, repeated reads at 12/24, and 18 whole-root queries for a 24-row page. The
committed cost test also checks 48-row growth. Type checks and focused lint passed before the last
test extensions; repeat them with format, browser and complete fast/static gates. This remains a
bounded performance correction, not AC-34 through AC-37 or full-audit acceptance.

The added observer negative `data-table-observer-public-negative-final.log` fails both
observe-then-throw rollback and original-error ordering after disconnect failure. The correction
passes 131 tests/four suites in `data-table-observer-corrected-focused-second.log`, with no
unhandled errors. The final focused Playwright selection passes all 24 cases (eight per engine),
including the native 12/24/48-row cost/page control, six existing document ownership modes and the
component workflow. This focused-only status is superseded by the bounded checkpoint below.

The corrected 925-file checkpoint now passes 4,920 units, all six fast/23 static gates and the
complete 1,245-case browser selection (415 per engine, zero skips/flakes/errors). The verifier
`verify-data-table-cost.mjs` binds the exact selection, 3,495 integration assertions in 112 files,
120 source/74 output hashes, 108 mapped sources/293 contents, twelve declaration/API reports and 262
declaration outputs to fingerprint
`b4009d7d97a6426d5eb47704adb9a5eac8d71a68017ba09fa055e144144f7293`. An additional 30-case actual
Turbo/htmx baseline passes on the same files, ten per engine; it does not cover the remaining
generic/UI host matrix. The isolated build still exceeds fixed limits by 774 bytes CSP gzip, 1,089
core gzip, 1,203 CSP Brotli, 870 stores gzip, 92,190 root raw, 91,194 UI ESM, 89,498 UI CommonJS and
93,494 UMD. No ceiling is raised. AC-39 retains bounded cost/browser proof but stays unchecked until
installed-package, coverage and complete delivery requirements are met. Later tracked edits make
these exact-tree results historical for final delivery.

### September 22 staged plugin listener evidence

The new public suites first fail nine cases with five controls on the accepted pre-correction
source; the log is `plugin-listener-public-negative.log` in the ignored September 19 audit
directory. The tracked correction passes 177 tests across six kernel/plugin/lifecycle files,
complete `npm run typecheck`, and focused ESLint. Initial focused lint found a non-Error
cancellation marker and a void-expression return in a test wrapper; both were corrected without
changing behavior or allowances. The 33-case Playwright selection passes in Chromium, Firefox and
WebKit with no skips, flakes or failures (`plugin-listener-browser-focused-second/results.json`).
The source/test type and lint logs and full commands are saved beside that result. The complete
checkpoint below supersedes this focused-only status.

The first tracked `quality:fast` run passes 4,906 unit cases and all gates except spelling. The
static spelling log rejects one compound word in umbrella 0033; it is changed to `type checks`. This
run predates the three additional method-getter negatives and source correction, so it cannot
authorize Code closure. The ignored three-case negative fails on undefined, null and object method
returns after cancellation. The promoted three-case negative reproduces the same failures, followed
by 177 focused and 33 browser passes after the method-read correction. Preserve both logs and run
fresh full checks after correction.

The final current-tree `quality:fast` report `2026-09-23T01-12-33-614Z-95733/report.json` passes
4,909 units, all six fast gates and 23 static gates. The complete Playwright run passes 1,242 cases,
414 per engine, with zero skipped, flaky, unexpected or errored cases. The 924 input hashes and
terminal fingerprint `fdf0b1d48b9286db68b1d741726bc4ce6bc5beb88a30e1810157cabcd37666d8` match the
fast start/end fingerprints. `plugin-listener-verified-checkpoint.json` checks the exact browser
selection, 3,484 integration assertions in 111 files, 120 source/74 output build hashes, 108 mapped
sources/293 contents, 12 declaration/API reports and 262 declaration output hashes. The isolated
build still exceeds fixed limits by 774 bytes CSP gzip, 1,089 core gzip, 1,203 CSP Brotli, 870
stores gzip, 91,416 root raw, 90,421 UI ESM, 88,725 UI CommonJS and 92,720 UMD. No ceiling is
raised. AC-38 is verified for this source; installed-package consumers, actual hosts, coverage,
fixed budgets and complete delivery remain open under AC-34 through AC-37 and ticket 0033. Later
tracked edits make this checkpoint historical for delivery without invalidating its bounded result.

The preceding document-listener checkpoint passes its resumed complete browser run: 1,209 cases, 403
per engine, zero skips/flakes/errors. All 922 saved inputs match fingerprint
`c36e5c61d1d3067d23f080ff9855d3fcb1d3756933e7178549db55f5f9a1f75e` at terminal. The resumed verifier
binds this to the earlier exact-tree fast result (4,892 units, six fast/23 static gates, 3,467
integration assertions), isolated build/maps and twelve declaration/API reports.
`document-listener-resumed-verified-checkpoint.json` is bounded acceptance for that source only; the
earlier interrupted run remains historical.

### September 21 document listener evidence

Second frozen fast session 20495 exits 0 (report 2026-09-21T20-35-42-311Z-29133): 4,880 units, all
six fast gates and all 23 static gates pass on matching inputs. Five new getter probes then fail,
and the promoted twelve-case extension fails with thirty-seven controls. This is a demonstrated gap
in the Plan's replacement contract, so the second browser run is deliberately stopped (15129 exit
130, Playwright 29202 SIGINT; partial results retained). No complete checkpoint acceptance is
claimed.

Acquisition ordering is allocated before method/options lookup and recorded only after successful
native setup. Older acquisition rollback preserves a newer completed identity, including a nested
duplicate of an earlier owner. All 49 public cases and 198 tests/six focused files pass (13269 exit
0). All 54 focused browser cases pass (96847 exit 0), eighteen per engine, no skips/flakes/errors.
Complete types 69737 and lint 16916 pass. The third final selection contains 1,209 cases
(403/engine); pending whole-tree checks must bind the documented source. The new isolated runtime
measurement replaces the older source binding without changing configurations, entries, budgets or
root dist. Build 49797 exits 0; 120 source hashes, 74 outputs, 108 unique mapped sources and 293
occurrences match. Current fixed overages in bytes: core gzip 982, CSP gzip 665, CSP Brotli 1,114,
stores gzip 751, root raw 91,370, UI ESM 90,421, UI CommonJS 88,725 and UMD 92,724. Earlier
measurements remain historical.

The first complete fast run (59630 exit 1, report 2026-09-21T20-30-38-927Z-13735) passes all 4,880
units and 23 static gates but fails formatting in six documentation files. The matching browser
session 11531 is deliberately interrupted after that failure requires a corrected input set
(Playwright PID 13789 receives SIGINT, runner exits 130). Its partial results remain under
document-listener-browser-final and are not accepted. Format the six files, preserving all README
content before the appended listener prose so frozen expression line locations cannot move. Fresh
fast/browser artifacts use second-run paths. Runtime build/maps stay valid because only
prose/formatting changes. No failure history, budget or gate is removed.

Plan validation passes before public test/source changes. The public negative has seventeen
failures/thirteen controls. The first correction passes 179 focused tests. Two added nested-options
cases fail while thirty controls pass; separating provisional identities produces 181 passes. Native
abort/validation and staged listener controls expand the suite to 37 and the focused run to 186
passes across six files (41417 exit 0). Preserve all logs under document-listener-* in the ignored
September 19 audit directory.

Focused browser session 5002 exits 0: all 39 cases pass, thirteen per engine, with no skips/flakes.
The first source typecheck passes, and the second complete typecheck exposes new fixture tuple,
readonly-union and explicit-undefined option typing errors. The fixture receives exact native tuple
annotations, a typed options variable and a native undefined-valued property fixture. Source/test
lint initially reports one unnecessary conversion, one unbound method and two test assertions;
corrections pass the second lint run without allowances. Complete types pass after those corrections
(41598 exit 0). The isolated all-entry build passes (87841 exit 0), with 120 source hashes, 74
output hashes and 108 unique mapped sources verified. The complete 1,194-case browser/fast/static
checkpoint remains pending. Prior passing evidence is retained.

Current fixed overages in bytes: core gzip 924, CSP gzip 607, CSP Brotli 1,014, stores gzip 694,
root raw 91,214, UI ESM 90,421, UI CommonJS 88,725 and UMD 92,555. No ceiling is raised and no
output/consumer entry is omitted.

### Current full-checkpoint verification — September 21

First full fast session 51562 exits 1, report 2026-09-21T19-19-25-012Z-24923: 4,752 unit passes and
one CSP inventory failure, plus six Markdown formatting failures. Of 23 static gates, 21 pass;
Markdown finds a duplicate blank line and spelling flags an unquoted event name. README paragraph
insertion moved line references in the frozen CSP map; move the new usage prose to the end and
format the affected documents. Preserve the map, inventory, scanner and frozen digest.

Current runtime measurement 41837 exits 0. The isolated build uses all unchanged Vite entries and
leaves root dist untouched. Its 120 source hashes, 74 output hashes and source-map content for 108
unique sources (293 occurrences) match current files. Binding:
ui-resizable-sortable-measurement-binding.json. Fixed overages in bytes: core gzip 309, CSP Brotli
451, stores gzip 107, root raw 88,591, UI ESM 89,935, UI CommonJS 88,239 and UMD 89,888. These are
failures for the full audit; ceilings stay fixed. The initial binding check confused unique sources
with occurrences; every content comparison had already matched. The corrected binding records both
counts.

The validated full browser selection has 1,137 cases: 379 per engine, 1,044 document cases covering
all 50 families and 93 existing component controls. The exact selection is preserved in
ui-resizable-sortable-browser-selection.json; run-resizable-sortable-browser.mjs executes it. Final
commands are npm run quality:fast and that browser runner, with logs
ui-resizable-sortable-fast-final.log and ui-resizable-sortable-browser-final.log. Acceptance
requires all six fast/23 static gates, complete units, all browser cases with no skips/flakes, and
matching startup/terminal fingerprints. The current status, report paths, full integration subset,
hashes and measurement binding are kept in ui-lifetime-continuation-state.json under the existing
audit evidence directory. Tickets 0006/0033 remain coding after document-family acceptance; all
cross-cutting and full audit requirements remain.

### Sortable and browser follow-up — September 21

- Sortable first focused run: 154 passes/one failure (63081 exit 1): a button becoming disabled
  after its own accepted move incorrectly suppressed change notification. Native operation guards
  now allow expected constraint writes while source snapshots still detect external changes.
- Second focused run passes 155 tests (38873 exit 0). First Sortable lint has six numeric/string
  concatenation errors; explicit string conversion corrects them. Typecheck 57129 exits 0.
- Follow-up negative: six failures/70 controls (33478 exit 1), covering list-background drop,
  alternative buttons during preview and duplicate patched item values. All corrected; combined
  focused 28141 passes 261 cases; lint 20776 exits 0. Nested fixture buttons now declare
  type=button.
- Focus negative: four failures/78 controls (20888 exit 1). Established browser controls fail the
  multipart Sortable workflow in all three engines (3032: three fail/six pass), confirming native
  DOM movement loses focus. Focus restoration and idle navigation-key behavior correct the issue.
  Stronger focus reentry control changes focus inside the actual native append interceptor.
- Combined focused 45546 exits 0: 267 cases/nine files. Browser 54821 exits 0: 45 cases across all
  engines, six document modes per family plus three established component controls.
- Initial browser selector was anchored against full Playwright titles and selected zero tests
  (20823 exit 1). The corrected selection 6154 produces nine failures/27 passes: the adoption
  identity assertion confused retained membership with first position after intentional reorder. It
  now checks the original native handle remains contained and the exact retained order.
- Trusted native dragging 56888: three Resizable passes/three Sortable failures. Native drop/form
  order and owner events pass; the fixture reads DataTransfer on the handle before list delegation.
  Observe dragstart on the root after the handler. This changes observation only. Fixture callback
  typing also uses the native HTMLElement overload instead of nullable EventTarget parameters.
- Trusted native pointer/HTML drag rerun 28247 exits 0: all six cases pass after correcting the
  observer's propagation phase. Typecheck 92478 exits 0. Lint boundary check 51871 exits 0: 352
  TypeScript files and 284 exact allowances, with no increase or inventory edit.
- Evidence uses ui-resizable-sortable-_, ui-sortable-document-_ logs under the existing audit
  evidence directory. Lint 49983 exits 0. Types 24746 reports the overload mismatch before
  correction.

Current full browser/fast, isolated build/maps, integration and public documentation checks remain
required. Historical Feed acceptance does not prove the new tree.

### Resizable/Sortable document continuation — September 21

All commands use Node 24 and the repository tools PATH. Evidence directory:
.git/jqstar/program-audit/quality-refresh-2026-09-19/.

- ticket:validate -- --phase plan --ticket docs/tickets/0006-make-lifecycle-transactional.md:
  passes; ui-resizable-sortable-document-plan.log.
- Fresh public Resizable/Sortable negative: 89 failures, nine controls (98 cases, two files),
  session 72648 exit 1; ui-resizable-sortable-document-negative.log/.json. Pre-edit sources and
  input hashes preserved alongside that report.
- First Resizable focused run: 130 passes/15 pointer failures. First typecheck reports readonly
  sizes rejected by the private mutable parameter. Corrected owned event cancellation and input
  parameter; second focused session 16326 passes all 145; typecheck 36838 exits 0.
- Added 24 cases. First follow-up has six failures and three observer errors: two assertions used an
  ineffective Storage instance spy, and invalid fixture constraints survived into automatic
  enhancement. Corrected to the owner Storage prototype and restored invalid fixtures in finally.
  Corrected negative session 33177 proves four failures/64 controls, no unhandled errors: moved
  anatomy and replaced-part pointer release, each in local and foreign documents.
- Corrected focused session 83194 exits 0: 169 tests in six files (document, primary, lifecycle,
  form-pointer resources, realm and private-property contracts).
  ui-resizable-document-focused-third.log.
- ESLint src/ui/resizable.ts test/ui-resizable-document.test.ts passes (47121 exit 0).

The 4,603-unit/1,086-browser Feed checkpoint remains historical after these edits. Full audit,
current Sortable/browser/fast/package evidence, public documentation and npm run check remain open.

JSON Viewer and Log Viewer evidence (2026-09-19, under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`):

- Ten ignored discovery failures are promoted and expanded into 59 public cases. First public
  negative: **50 fail/nine pass**, no fixture or unhandled errors (`ui-viewer-public-negative.log`).
- Initial correction: **216 pass/five files** and TypeScript pass. Lint identifies a generic Map
  assignment and an already-narrowed filter guard. Subsequent controls: **65 pass/three fail**
  across 68 cases, exposing constrained actions and reused log-entry IDs. Correct those paths.
- `npx vitest run test/ui-viewer-document.test.ts test/ui-json-viewer.test.ts test/ui-log-viewer.test.ts test/ui-viewer-lifecycle.test.ts test/ui-controller-resource-lifecycle.test.ts`:
  **225 pass/five files**, no unhandled errors (`ui-viewer-focused-corrected.log`). Lint follow-up
  binds the selected public method through an arrow, preserving the API receiver. Browser fixture
  lint removes a redundant optional/boolean comparison; no allowance is added.
- `npx playwright test e2e/ui-document-ownership.spec.ts e2e/components.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit --grep "json-viewer supports|log-viewer supports|control plane applies|control-plane components"`:
  **42 pass**, zero skipped/flaky/unexpected. All 126 startup source hashes and the report hash
  verify at terminal (`ui-viewer-browser-targeted-inputs.json`). Browser fixtures were already
  prepared; no build or tracked edit overlaps this run.
- Complete UI/kernel/bridge integration passes **2,678 tests across 99 files**
  (`ui-viewer-integration-first.log`). Focused lint passes, and the boundary ratchet passes at **344
  TypeScript files/286 exact allowances** after removing obsolete entries.
- The first CSP contract check rejects a new literal template placeholder in the browser fixture.
  Set the concrete action on the button before application setup, matching the other dynamic
  fixtures. Keep the frozen expression inventory and runtime contract unchanged. Preserve the failed
  check in `ui-viewer-csp-contract.log` and verify the correction before the full browser run.
- The corrected CSP check passes all four tests. Fixture lint then rejects one extra branch in the
  already long browser scenario. Use a two-entry action map and retain the existing complexity
  limit. Stop the premature full browser run at terminal exit 130 before editing; its partial
  results supply no passing cohort evidence. The corrected full run uses separate artifacts.
- Follow-up review exposes a stale JSON render marker after a nested expansion request. The public
  run records **68 passes/two failures** (`ui-viewer-render-public-negative.log`). Release that
  render marker independently of revision, while keeping commit rollback guarded. The corrected
  suite passes **227 focused tests plus four CSP tests** (`ui-viewer-render-focused.log`), with
  TypeScript and focused lint passing. The second full browser attempt ends at exit 130 before this
  source edit; all 126 source and 911 worktree hashes were unchanged during that interrupted run.
  Add a matching browser recovery assertion and retain both interrupted runs as diagnostics.
- Final full integration passes **2,680 tests/99 files** (`ui-viewer-integration-final.log`). The
  final browser command retains both specs, all three engines and every previously covered family,
  with the new control-plane selections. `ui-viewer-browser-final-inputs.json` binds **864 passes**,
  zero skipped/flaky/unexpected: 822 document cases/38 families plus 42 existing controls, 288 per
  engine. All 126 source and 911 worktree hashes verify at terminal.
- The final lint ratchet passes **344 files/286 exact allowances**. The fresh fast report and exact
  documented-tree fingerprint must be verified in the continuation state before accepting this
  checkpoint. Owner 0006 remains coding with the original AC-34 through AC-37 open.
- The isolated runtime build and four consumer previews pass graph and source-map checks without
  changing root distribution files. `ui-viewer-measurement-binding.json` binds 120 sources, 74
  outputs and 108 represented source maps. Fixed overages remain: core gzip 309 bytes, CSP Brotli
  451, stores gzip 107, root consumer raw 57,825, UI ESM 57,869, UI CommonJS 56,413 and UMD 58,273.
  This is current size evidence, not installed-package/API acceptance.
- Read-only Chart/Data Table review records 20 bound diagnostic failures. One observes listener
  churn; a separate cleanup reentry case proves duplicate sort events. The adoption case stops at
  its native-part guard before proving handoff. Preserve these qualifications during public
  promotion. Full remaining families, actual hosts, fixed ceilings, semantic/manual review and
  actual npm run check/delivery remain required.

Clipboard and Code Block evidence (2026-09-19; logs under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`):

- The first public suite records 59 failures/four passes without unhandled errors. The initial
  implementation passes 202 assertions but has two invalid-selector fixture errors; restoring the
  selector synchronously corrects the fixture. Four initial-output negatives then preserve Code
  Block's absent/authored state and both families' authored status text.
- The expanded handoff suite records 83 passes/two stale description failures and one unhandled
  native rejection. Removing copied generated tokens and observing transport rejection after button
  acquisition failure correct these paths. Eight completion-before-claim adoption controls pass
  without a separate runtime change.
- `npx vitest run test/ui-copy-document.test.ts test/ui-clipboard.test.ts test/ui-code-block.test.ts test/ui-controller-resource-lifecycle.test.ts`:
  **224 pass/four files**, no unhandled errors (`ui-copy-focused-handoff.log`). The new public suite
  contributes 85 cases. TypeScript and focused ESLint pass; the first ratchet reports only seven
  obsolete allowances, which are removed.
- `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts test/access-manager-block.test.ts`:
  **2,610 pass/98 files**, no failures or unhandled errors (`ui-copy-integration-first.log`).
- The first native selection runs 78 cases: **77 pass/one failure**, no skips/flakes. Firefox's
  Clipboard action case loses its execution context during a Vite reload while browser-fixture
  preparation is still running. Its retained trace records the CSS hot reload and reconnect. All 126
  startup source hashes still match at terminal (`ui-copy-browser-targeted-inputs.json`); this
  failed run is diagnostic evidence only. Preparation subsequently exits zero. The full browser
  matrix must run after preparation against stable files before checkpoint acceptance.
- `npx playwright test e2e/ui-document-ownership.spec.ts e2e/components.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit --grep "ui-document-ownership|tooltip|validated forms and composed surfaces|dropdown menu|context menu, menubar|application interaction components|clipboard and editable|operations components"`:
  **822 pass**, zero skipped/flaky/unexpected after preparation completes. The cohort has 786
  document cases across 36 families and 36 existing component controls, 274 per engine. All 126
  startup input hashes and the report hash verify at terminal (`ui-copy-browser-full-inputs.json`).
  Existing component controls verify native forms, exact copied JSON, keyboard behavior and
  automated accessibility. All native copy/legacy capabilities are per-window test stubs.
- Final TypeScript and the 343-file/288-entry immutable lint ratchet pass. Seven obsolete exact
  allowances are removed. The README and component/ownership/testing guides describe the behavior.
- The built-distribution preview binds 120 source/337 distribution hashes and verifies 108 matching
  source-map contents. Its initial measurement helper failed on a directory entry; the corrected
  recursive file inventory passes. `ui-copy-measurement-binding.json` records the boundary and
  failures against unchanged ceilings: core gzip +309, CSP Brotli +451, stores gzip +107, root
  consumer raw +54,443, UI ESM +54,403, UI CommonJS +53,001 and root UMD +54,882 bytes. CSP source,
  ESM and CommonJS graph checks find no forbidden modules. Installed-package acceptance remains
  open.
- First documented-tree fast (`2026-09-19T22-04-15-050Z-75024`) fails with 3,993 passes/one unit
  failure and 22 passing static checks/one failure. The README paragraph shifts generated CSP
  expression locations. An initial inventory refresh makes that location change visible in the
  combined digest, so its focused check still fails. Place the same new copy notes alongside the
  README's existing cleanup documentation, after the expression examples, then regenerate the
  inventory to retain the frozen digest and locations. Markdown lint reports a skipped heading level
  at the new audit checkpoint; use the proper level. Preserve both failure logs. Neither correction
  changes runtime behavior, browser inputs, grammar or expression coverage.
- Read-only continuation work on JSON Viewer and Log Viewer produces ten isolated diagnostic
  failures without fixture or unhandled errors (`ui-viewer-document-probe-inputs.json`). Foreign
  facades/actions, newer serializer results, current source/entries, changed render depth, newer
  clear and interrupted listener cleanup require public promotion and expanded regressions. No
  viewer runtime change or full-audit completion is claimed by this copy checkpoint.

Menu/Context Menu/Menubar commands and evidence (2026-09-19), under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Commands use the same canonical Node/npm
PATH recorded below.

- Public Menu negative runs preserve **139 pass/66 fail/205 total**, then **145 pass/96 fail/241
  total**. Deliberate cleanup-failure fixtures were corrected to consume their already-disposed
  owners rather than repeat cached cleanup errors during teardown.
- The first Menu focused worker hit a Menubar MutationObserver loop from repeated `data-value`
  writes; it exited unexpectedly. Sampling and inspector evidence are in
  `ui-menu-focused-loop-diagnostic.md`. It provides no acceptance for its unfinished public file.
  Public idempotent-reflection and empty-menu-focus negatives drove corrections. Kind-specific
  snapshots corrected missing Menu-to-Context Menu opening notifications. The later Menu focused
  result has **393 pass/three fail/396 total**; only Menubar remained failing.
- Menubar public negatives: **245 pass/21 fail/266 total**, then **245 pass/25 fail/270 total**
  after inherited constraints and retained-deadline controls. The rewrite passed all 270 public
  cases. Two focused attempts each retained one older fake-timer/real-clock mismatch; the resource
  fixture now includes Date in its fake clock. Later inactive-child horizontal navigation negatives
  have **270 pass/two fail/272 total**, corrected without making inactive items activatable.
- Final focused command uses `npx vitest run` with the public floating document/resource/labels,
  transition-cancellation, Menu, Context Menu, Menubar and popup-lifecycle files: **435 pass/eight
  files** (`ui-menubar-focused-final.log`). The public document suite has **272 passes**.
- Full integration:
  `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts test/access-manager-block.test.ts`:
  **2,525 pass/97 files**, no pending tests (`ui-menubar-integration-final.log`). The attempted
  nonexistent `test:integration` npm script is preserved as an invocation error, not test evidence.
- Initial targeted native browser evidence: **183 passes** for Menu/handoffs and then **90 passes**
  for all three menu families, including existing behavior/accessibility controls. Both terminal
  reports verified all 125 startup inputs. The first full run was deliberately interrupted after the
  two public inactive-item failures were established: **125 pass/619 skip**, exit 130. Its verified
  input/report binding is diagnostic only (`ui-menubar-browser-full-inputs.json`).
- Final TypeScript passes (`ui-menubar-typecheck-final.log`); source and fixture narrowing errors
  from earlier attempts remain recorded. Focused ESLint passes. The final ratchet passes **341
  TypeScript files/295 exact file-rule entries** (`ui-menubar-ratchet-final.log`), down from 298
  without any increased allowance.
- Final full browser command:
  `npx playwright test e2e/ui-document-ownership.spec.ts e2e/components.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit --grep "ui-document-ownership|tooltip|validated forms and composed surfaces|dropdown menu|context menu, menubar|application interaction components"`:
  **744 pass**, zero failures/skips/flakes. All 125 startup inputs and the report hash verify at
  terminal (`ui-menubar-browser-final-inputs.json`). Each engine passes 248 cases: the full set
  contains 720 document cases across 34 families and 24 unchanged component controls.
- `npm run quality:fast` is the final written-checkpoint gate; its report, start/end fingerprint,
  independent fingerprint and terminal session are recorded in
  `ui-lifetime-continuation-state.json`. This cohort does not close the remaining
  families/cross-cuts, actual hosts, fixed package ceilings, semantic review, manual accessibility
  or actual npm run check/full delivery.

The preceding Hover Card checkpoint follows.

Hover Card/shared native ownership commands and evidence (2026-09-19), under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`. Commands use Node 24.18.0/npm 11.16.0 with
`PATH="/opt/homebrew/opt/node@24/bin:$PWD/.git/jqstar/tools/bin:$PATH"`.

- Cross-kind handoff negatives: `ui-floating-handoff-negative.log` has **83 pass/20 fail**; recovery
  reentry adds two failures (**83 pass/22 fail**). The first shared-owner extraction passes those
  six new controls but actual native handoff has **six pass/six fail**, preserved in
  `ui-floating-handoff-browser-first-inputs.json`. All opening handoffs fail in the platform.
- Added accepted-notification assertions and Hover Card controls produce **91 pass/46 fail** in
  `ui-floating-completion-negative.log`. Content-wide native-call ownership/deferred completion
  passes **231/fails 44 across six files**; all twelve corrected real native handoffs pass with one
  notification (`ui-floating-completion-browser-inputs.json`).
- Hover Card rewrite passes **267/fails twelve across seven files**; all six directed handoffs
  extend that to **275 pass/twelve fail** (`ui-hover-card-focused-handoff.log`). Current public
  suite includes two later detachment controls: **135 pass/twelve fail, 147 total**. All 38 Hover
  Card, 44 Tooltip, 39 Popover and fourteen shared native controls pass.
- First native Hover Card selection: **62 pass/ten fail**, all 125 inputs/report verified at
  terminal (`ui-hover-card-browser-first-inputs.json`). Nine adopted cases had a fixture that
  deliberately departed a zero-delay card before asserting it stayed open. Corrected pointer entry
  follows a separate retained-focus assertion. The other failure is Chromium preserved removal:
  `ui-hover-card-preservation-diagnostic.log` records focus departure before actual disconnection,
  then a timer clearing open state while detached. The public negative fails as **133 pass/13 fail**
  (`ui-hover-card-detach-negative.log`). Guarding formerly connected delayed continuations fixes
  that regression and retains explicitly detached activation.
- Corrected targeted command:
  `npx playwright test e2e/ui-document-ownership.spec.ts e2e/components.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit --grep "Hover Card|Floating content|validated forms and composed surfaces"`:
  **72 pass**, no skips/flakes/failures; 125 inputs/result verified at terminal
  (`ui-hover-card-browser-corrected-inputs.json`).
- Complete UI/DOM/kernel/bridge/declarative/testing-adapter and Access Manager Vitest selection:
  **2,388 pass/twelve fail across 97 files**, no pending tests
  (`ui-hover-card-integration-corrected.log`). The twelve failures remain in Menu, Context Menu and
  Menubar; no failure is excluded.
- `npm run typecheck`, focused ESLint on the four runtime files and public/browser fixtures/spec,
  and `node scripts/quality/check-lint-boundaries.mjs` pass. Ratchet remains **341 TypeScript
  files/298 exact file-rule counts**. Initial/corrected static logs remain in this directory.
- Full browser command adds
  `--grep "ui-document-ownership|tooltip|validated forms and composed surfaces"`: `--list` verifies
  **570 cases**. Its final input/result binding and fresh fast report belong to this written
  checkpoint; prior Tooltip fast/browser evidence is historical. Owner remains coding and AC-34
  through AC-37 stay unchecked. Actual `npm run check`, full delivery and every original audit
  requirement remain open.

The first full browser matrix passes **570 cases** with no failures, skips or flakes and all 125
inputs/result hashes verified at terminal. The first fresh fast run has **3,772 unit passes/twelve
failures** and one static failure: the obsolete title wrapper is now unused. The source fingerprint
is stable (`2026-09-19T20-50-33-207Z-11316`). Preserve that failed run and browser binding; after
removing the wrapper, repeat exact-source browser and fast verification. Final bindings belong to
`ui-hover-card-browser-final-inputs.json` and the continuation state.

The preceding Tooltip evidence follows.

Tooltip checkpoint commands and evidence (2026-09-19), under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`, using Node 24.18.0/npm 11.16.0:

- `npx vitest run test/ui-floating-document.test.ts`: first extended negative has **46 fail/40 pass
  across 86 cases**, without unhandled errors (`ui-tooltip-public-negative.log`). This includes 30
  Tooltip failures and sixteen other-family failures.
- Focused command adds `test/ui-tooltip.test.ts`, `test/ui-popover.test.ts`,
  `test/ui-floating.test.ts`, `test/ui-floating-resource-lifecycle.test.ts` and
  `test/ui-floating-labels.test.ts`. First rewrite accidentally renames the native Popover helper
  import, producing 72 failures/152 passes and 77 errors (`ui-tooltip-focused-first.log`).
  TypeScript identifies that error; restore `usesNativePopover` without changing shared code. The
  corrected run passes **208/fails 16 across six files** (`ui-tooltip-focused-corrected.log`).
- Ten native/description/continuation follow-ups expose generated-description ownership lost during
  cleanup-time destination reacquisition: **17 fail/79 pass** (`ui-tooltip-native-negative.log`).
  Split cleanup so it saves retained state, releases the generated token, then hides native content.
  Each cleanup remains independently attempted. Final focused result: **218 pass/16 fail across six
  files**, including all **42 Tooltip cases** (`ui-tooltip-focused-final.log`).
- `npm run typecheck` and focused ESLint on Tooltip, the public suite and browser fixture/spec pass
  (`ui-tooltip-typecheck-final.log`, `ui-tooltip-lint-final.log`). The initial import diagnostics
  remain in the first typecheck/lint logs.

- The first targeted browser command runs the document fixture with all three desktop projects and
  `--grep "Tooltip"`: **30 pass**, with 124 startup inputs/report verified at terminal
  (`ui-tooltip-browser-first/results.json`). The first full integration has **2,333 pass/16 fail
  across 97 files** (`ui-tooltip-integration-final.log`). These precede the next correction.
- Three native-state follow-ups fail: both Tooltip and Popover miss immediate close after authored
  native show, and Tooltip's native toggle can overwrite a newer request made from timer cleanup.
  Public result: **19 fail/80 pass across 99 cases** (`ui-tooltip-native-close-negative.log`). Stop
  the running full browser matrix with SIGINT before source edits: terminal exit 130, **169 pass/329
  skipped**, no unexpected/flaky cases (`ui-tooltip-browser-final/results.json`). Its interrupted
  report/input binding remains evidence of an incomplete run, never acceptance.
- Both facades now reconcile settled native state before operations while preserving in-flight
  native depth. Tooltip rechecks the captured revision after canceling a timer during toggle
  handling. Focused result: **221 pass/16 fail across six files**, including all **44 Tooltip and 39
  Popover cases** (`ui-tooltip-native-close-focused.log`). TypeScript and focused lint pass again
  (`ui-tooltip-{typecheck,lint}-verified.log`). The sixteen remaining failures belong to Hover Card,
  Menu, Context Menu and Menubar. None is excluded or changed to an expected failure.

- Targeted corrected browser command uses `--grep "Tooltip|Popover"` and all three desktop projects:
  **102 pass**, zero failed/skipped/flaky (`ui-tooltip-native-close-browser/results.json`). The
  case-insensitive CLI grep also selects Select, Combobox and Multi Select native-popover cases. The
  startup binding's intended 48-case scope is retained separately from the actual 102-case
  selection; all 124 inputs and the result hash verify at terminal.

- Final full browser command runs `e2e/ui-document-ownership.spec.ts e2e/components.spec.ts`, all
  three desktop projects and `--grep "ui-document-ownership|tooltip"`: **498 pass**, comprising
  **492 document cases across 30 families and six Tooltip behavior/accessibility cases**, zero
  failures/skips/flakes (`ui-tooltip-browser-verified/results.json`). All 125 startup inputs and
  result hash verify after terminal exit zero. The result's file counts independently match that
  selection; `ui-tooltip-browser-verified-inputs.json` binds it.
- Final complete UI/DOM/kernel/bridge selection plus Access Manager: **2,336 pass/16 fail across 97
  files** (`ui-tooltip-integration-verified.log`). The unchanged ratchet passes again at 341
  TypeScript files/298 exact counts (`ui-tooltip-ratchet-verified.log`).
- Final Plan/format/spelling/diff checks precede `npm run quality:fast` on this written checkpoint.
  The immutable report, unit result and independent fingerprint are recorded in
  `ui-lifetime-continuation-state.json`. Prior Popover fast evidence is historical. The sixteen
  public failures remain enforced; Code/Test closure and actual npm run check stay required.

Popover checkpoint commands and evidence (2026-09-19), under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`, using Node 24.18.0/npm 11.16.0:

- `npx vitest run test/ui-floating-document.test.ts`: all original 24 promoted cases fail
  (`ui-floating-public-negative.log`). Extended first negative: 51 fail/one pass across 52 cases
  (`ui-popover-public-negative.log`). The composed-focus, retained-state and native no-op negatives
  remain in `ui-popover-{composed-focus,retained,noop}-negative.log`.
- Focused command adds `test/ui-popover.test.ts`, `test/ui-floating-resource-lifecycle.test.ts`,
  `test/ui-floating-labels.test.ts` and `test/ui-calendar*.test.ts`: first correction 266 pass/22
  fail (`ui-popover-focused-first.log`). Avoid positioning during close acquisition, restore
  previously open native panels before listener acquisition, and honor explicit composed initial
  focus. Intermediate corrected counts are 269/20 and 272/20. Final: **274 pass/20 fail across seven
  files**, including all 38 Popover cases (`ui-popover-focused-final.log`). Other failures belong to
  Tooltip, Hover Card, Menu, Context Menu and Menubar; these remain failed gates.
- Targeted Playwright command uses `e2e/ui-document-ownership.spec.ts`, all three desktop projects
  and `--grep "Popover supports"`. First 18 fail: preserved native panels close on detach; the
  action fixture also needs enhancement settlement and separation of declarative versus UI-owned
  listener retirement. Corrected fixture still fails all 18 only on preserved panel state. Native
  restoration then passes nine/fails nine on focus. New native no-op controls fail all 18; native
  reconciliation then passes twelve/fails six, all remaining failures Chromium preserved focus.
  Separate `ui-popover-browser-{first,fixture-corrected,corrected,noop-negative,native-final}`
  directories retain reports and input bindings. The first binding was captured during the run;
  later bindings precede launch. The one-case `ui-popover-focus-inspection` trace is diagnostic, not
  acceptance; its temporary fixture changes were restored before final verification.
- `npx vitest run test/ui-preserved-focus.test.ts`: first readiness negative is one fail/two pass
  (`ui-preserved-focus-negative.log`). Add `test/kernel.test.ts`,
  `test/scoped-resource-lifecycle.test.ts`, `test/bridge-disposal-lifecycle.test.ts`,
  `test/turbo-bridge.test.ts` and `test/htmx-bridge.test.ts`: **113 pass across six files** after
  adding the remaining controls (`ui-preserved-focus-kernel-final.log`).
- Targeted browser command adds `e2e/components.spec.ts` and uses
  `--grep "Popover supports|popover uses|popover passes|calendar and date forms|date ranges and backend"`:
  **33 pass**, zero skipped/flaky/unexpected (`ui-popover-browser-kernel-final/results.json`), with
  125 inputs verified at terminal. The later lint correction changes only the kernel's local
  focus-observation flag to an object property; final full-matrix verification covers that tree.
- Initial focused lint diagnoses four Popover boolean-narrowing conditions, then two fixture type
  assertions/imports, then the kernel callback flag. Retain those logs and correct the code without
  changing allowances. Corrected focused lint passes (`ui-popover-kernel-lint-corrected.log`).

- Final full integration command is the prior UI/DOM/kernel/bridge selection plus
  `test/access-manager-block.test.ts`: **2,291 pass/20 fail across 97 files**
  (`ui-popover-integration-final.log`). All failures are the five unfinished floating families.
- Full Playwright command removes the grep and runs `e2e/ui-document-ownership.spec.ts` in all three
  desktop projects: **462 pass across 29 families**, zero skips/flakes/unexpected
  (`ui-popover-browser-final/results.json`). All 124 startup inputs and report hash verify after
  terminal exit zero; the binding is `ui-popover-browser-final-inputs.json`.
- `npm run typecheck`, corrected focused ESLint and `node scripts/quality/check-lint-boundaries.mjs`
  pass (`ui-popover-kernel-{typecheck,lint,ratchet}-corrected.log`). The ratchet retains 298 exact
  counts across 341 TypeScript files. The first documentation spelling check flags the unquoted
  native event name; quoting it corrects that failure without an exception.
- Final Plan/format/spelling/diff checks precede `npm run quality:fast` on the written checkpoint.
  Its immutable report, unit results and independent fingerprint are recorded in
  `ui-lifetime-continuation-state.json`. The prior Transfer List fast report is historical. The 20
  public failures remain ordinary enforced tests; Code/Test closure and actual npm run check remain
  pending. No fixed ceiling, graph rule, test inventory or lint allowance is weakened.

Transfer List checkpoint commands and evidence (2026-09-19), under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`, using Node 24.18.0/npm 11.16.0:

- Public `npx vitest run test/ui-color-file-tree-transfer-document.test.ts` first negative: 47
  fail/171 pass plus six observer errors from stale controls corrupting native lists
  (`ui-transfer-list-public-negative.log`). Assert actual native lists and remove corrupted fixtures
  in finally; corrected result: **49 fail/169 pass**, without unhandled errors
  (`ui-transfer-list-public-negative-corrected.log`).
- Focused command adds `test/ui-transfer-list.test.ts`, `test/ui-transfer-list-values.test.ts` and
  `test/ui-collection-resource-lifecycle.test.ts`: first correction 279 pass/three fail
  (`ui-transfer-list-focused-first.log`). Fix Enter after preventDefault and read option.selected
  instead of jsdom's stale selectedOptions after reset. The isolated native inspection negative is
  `ui-transfer-reset-selected-options-negative.log`; it does not establish browser behavior.
- Four native continuation cases produce four failures/218 passes, including SVG and reassociated
  form reset (`ui-transfer-list-followup-public-negative.log`). Corrected focused: 286 pass. A
  native-option double-click then fails: one fail/222 pass
  (`ui-transfer-list-option-target-negative.log`). Accept owned option targets. Final same four-file
  command passes **287 cases** (`ui-transfer-list-focused-final.log`), including all 223 public
  cases.
- Full command:
  `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`.
  **2,234 pass**, 94 files (`ui-transfer-list-integration-final.log`).
- Browser command:
  `npx playwright test e2e/ui-document-ownership.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit`,
  with separate `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY` outputs. Targeted
  `--grep 'Transfer List supports'`: **18 pass**. Full final matrix: **444 pass**, no
  failures/skips/flakes (`ui-transfer-list-browser-final/results.json`). Separate first/final
  bindings verify all 124 startup input hashes and report hashes.
- `npx tsc --noEmit` and focused ESLint on controller/public suite/browser fixture/spec pass
  (`ui-transfer-list-typecheck-final.log`, `ui-transfer-list-lint-final.log`).
  `node scripts/quality/check-lint-boundaries.mjs` first flags thirteen removed assertions; removing
  the allowance yields **339 TypeScript files/298 exact counts**
  (`ui-transfer-list-ratchet-final.log`).
- Discovery:
  `npx vitest run --config .git/jqstar/program-audit/quality-refresh-2026-09-19/ui-floating-document-probe.config.mjs`.
  Final fixture: **12 fail**, no unhandled errors (`ui-floating-document-negative-final.log`).
  Preserve the first two logs: numeric Context Menu coordinates and passive Tooltip content correct
  fixture mistakes. No floating controller source changes or semantic-review credit follow yet.
- `npm run ticket:validate -- --phase plan --ticket docs/tickets/0006-make-lifecycle-transactional.md`,
  focused `npx cspell --no-progress`, `npx prettier --check` and
  `git -c core.whitespace=cr-at-eol diff --check` verify the written checkpoint. Final
  `npm run quality:fast` writes the immutable scope-bound report referenced by continuation state.
  Actual npm run check, complete delivery and Code/Test phase closure still require full scope.

Transfer List final fast correction (2026-09-19), same evidence directory and canonical Node/npm:

- `npm run quality:fast`: run `2026-09-19T19-26-51-534Z-31128` fails. Unit results are **3,619
  pass/one fail**: Access Manager cannot add membership with registry-styled buttons. Static
  unused-code flags `listenToFormReset`; all other static gates pass. Preserve the immutable report
  and `ui-transfer-list-fast-final.log`.
- `npx vitest run test/ui-color-file-tree-transfer-document.test.ts test/access-manager-block.test.ts`:
  new styled-button/SVG negatives plus the block produce **eight failures/224 passes**
  (`ui-transfer-list-styled-negative.log`). Correct native styling-marker ownership and delete the
  obsolete helper. Add a nested non-native styling-marker control as well.
- Repeat the focused four-file command above plus `test/access-manager-block.test.ts`: **297 pass
  across five files**, including all **231 public cases/67 Transfer List**
  (`ui-transfer-list-styled-focused.log`). Full integration command above plus the same block:
  **2,244 pass across 95 files** (`ui-transfer-list-styled-integration.log`).
- Repeat the full three-engine browser command with registry-styled fixture buttons: **444 pass**,
  zero failures/skips/flakes (`ui-transfer-list-browser-styled/results.json`). The styled input
  binding verifies all 124 startup input hashes and the terminal report hash. Prior browser
  reports/bindings remain historical; none were overwritten.
- Repeat `npx tsc --noEmit`, focused ESLint including `src/ui/lifecycle.ts`,
  `npx --no-install knip --config knip.json` and `node scripts/quality/check-lint-boundaries.mjs`:
  all pass (`ui-transfer-list-styled-{typecheck,lint,unused,ratchet}.log`). The ratchet remains 339
  TypeScript files/298 exact counts. Repeated plan, spelling, format and diff checks accompany the
  completed written tree, followed by the final fast report bound in continuation state.
- Full source reads of all five floating controllers/shared floating code and existing resource/
  label suites are recorded in `ui-floating-document-review.md` with hashes. Observations guide
  future regression tests; they do not constitute completed semantic review or corrected behavior.

Tree checkpoint commands and evidence (2026-09-19), using Node 24.18.0/npm 11.16.0. Logs and browser
bindings are under `.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- Public `npx vitest run test/ui-color-file-tree-transfer-document.test.ts` negative: 47 fail, 113
  pass, 160 total (`ui-tree-public-negative.log`), including 43 Tree and four Transfer List. No live
  run remained when this continuation inspected the terminal log.
- Focused command adds `test/ui-tree.test.ts`, `test/ui-collection-resource-lifecycle.test.ts` and
  `test/ui-identity-constraints.test.ts`: first correction 220 pass/five fail
  (`ui-tree-focused-first.log`). Restore nearest-ancestor-first expansion for the existing disposal
  contract. Four direct-patch/disabled follow-up negatives give 156 pass/eight fail
  (`ui-tree-followup-public-negative.log`). Corrected focused result: 225 pass/four fail.
- Query expiry and stale timer controls give 227 pass/four fail across four files
  (`ui-tree-focused-complete.log`). Acquisition follow-up gives 163 pass/five fail across the 168
  public cases (`ui-tree-acquisition-negative.log`): late listener retirement passes, but a setup
  callback's direct root patch is overwritten. Guard the outer operation's reflected state.
- Final same four-file command: **229 pass/four fail**, all failures Transfer List
  (`ui-tree-focused-final.log`). All 59 Tree, 51 File Upload and 54 Color Picker public cases pass.
- Full command:
  `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`.
  First run: 2,173 pass/four fail. Final run: **2,175 pass/four fail**, 94 files
  (`ui-tree-integration-final.log`). No exclusions or expected-failure markers.
- Browser command:
  `npx playwright test e2e/ui-document-ownership.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit`,
  using separate `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY` outputs. Initial `--grep 'Tree supports'`: 18
  pass. First complete matrix: 426 pass. Final complete matrix after timer/setup corrections: **426
  pass**, no failures/skips/flakes (`ui-tree-browser-final/results.json`). Its binding file verifies
  all 124 startup input hashes and the report hash. Earlier bindings remain historical.
- `npx tsc --noEmit` and focused ESLint on Tree/public suite/browser fixture/spec pass
  (`ui-tree-typecheck-final.log`, `ui-tree-lint-final.log`). Earlier diagnostics expose the Window
  constructor cast, a non-null assertion and an unused timer parameter; all corrected.
  `node scripts/quality/check-lint-boundaries.mjs` passes 339 TypeScript files/299 exact counts
  (`ui-tree-ratchet-final.log`), with no inventory increase.
- Next discovery command:
  `npx vitest run --config .git/jqstar/program-audit/quality-refresh-2026-09-19/ui-transfer-list-followup-probe.config.mjs`.
  All eight cases fail without unhandled errors (`ui-transfer-list-followup-negative.log`). Transfer
  List source remains unchanged and the negatives must become public before editing it.
- Plan validation, focused documentation spelling, formatting and diff checks accompany this
  checkpoint. Current fast and actual full delivery remain pending; ticket stays coding.

File Upload checkpoint uses canonical Node 24.18.0/npm 11.16 with
`PATH="/opt/homebrew/opt/node@24/bin:$PWD/.git/jqstar/tools/bin:$PATH"`. Logs are under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-color-file-tree-transfer-document.test.ts`: Expanded public negative
  records 44 failures/65 passes plus one asynchronous fixture fault. Restoring the removal mock in
  finally and requiring actual retirement produces 45 failures/64 passes without unhandled errors
  (`ui-file-upload-public-negative-corrected.log`). Four later cases expose two cleanup/
  retained-error failures with two native-write controls: 10 fail/103 pass
  (`ui-file-upload-followup-public-negative.log`). Original logs remain preserved.
- The public suite plus `test/ui-file-upload.test.ts`,
  `test/ui-form-pointer-resource-lifecycle.test.ts`, `test/ui-rendered-parts-lifecycle.test.ts` and
  `test/ui-form-association.test.ts`: First 194 pass/eleven fail with three jsdom drop fixture
  errors. Explicit files arrays in those controller fixtures remove the errors. Corrected final
  result is 201 pass/eight fail across five files (`ui-file-upload-focused-corrected.log`).
- `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`:
  2,116 pass/eight fail across 94 files (`ui-file-upload-integration-verified.log`). The eight
  failures belong to Tree and Transfer List; this remains a failed gate without exclusions.
- `npm run typecheck`, focused `npx eslint` on the controller/public suite/browser fixture/spec, and
  `node scripts/quality/check-lint-boundaries.mjs`: pass in matching `ui-file-upload-*-verified.log`
  files. Initial lint diagnostics required removing a redundant File cast and giving the constructor
  double an asserted item writer. Initial ratchet diagnostics identify three removed conditions;
  deleting their allowance gives 339 TypeScript files / 299 exact counts, without increases or
  replacement exceptions.
- `npx playwright test e2e/ui-document-ownership.spec.ts --grep 'File Upload supports' --project desktop-chromium --project desktop-firefox --project desktop-webkit`:
  First 18 pass. The complete command without the filter passes all 408 across 26 families, zero
  failures/skips/flakes. Isolated artifact paths `ui-file-upload-browser-first/` and
  `ui-file-upload-browser-verified/` have corresponding input bindings verifying 124 hashes and
  report hashes. Unit file-property overrides are not native FileList/FormData proof.
- `npx vitest run --config .git/jqstar/program-audit/quality-refresh-2026-09-19/ui-tree-followup-probe.config.mjs`:
  All six ignored Tree probes fail without unhandled errors (`ui-tree-followup-negative.log`).
  Promote these negatives before its runtime correction.
- Current fast and actual npm run check remain required. The preceding Multi Select six-gate/
  3,397-unit fast is historical after the new controllers, tests, browser fixtures and docs.

Color Picker checkpoint uses canonical Node 24.18.0/npm 11.16 with
`PATH="/opt/homebrew/opt/node@24/bin:$PWD/.git/jqstar/tools/bin:$PATH"`. Evidence remains under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-color-file-tree-transfer-document.test.ts`: First public negative has 48
  failures/13 passes (`ui-color-file-tree-transfer-public-negative.log`). Five follow-ups have 14
  failures/52 passes, including a CSS fixture assumption. Correcting the fixture retains 13
  failures/53 passes (`ui-color-picker-followup-negative-corrected.log`), including two additional
  Color Picker continuation defects. All original logs remain preserved.
- The public suite plus `test/ui-color-picker.test.ts`, `test/ui-choice-resource-lifecycle.test.ts`,
  `test/ui-rendered-parts-lifecycle.test.ts`, `test/ui-form-association.test.ts` and
  `test/ui-transition-cancellation.test.ts`: First run passes 188/fails 12, corrected run passes
  194/fails eleven across six files (`ui-color-picker-focused-first.log` and
  `ui-color-picker-focused-corrected.log`). These runs precede the final CSS-wide parser change; the
  complete integration below covers the final source.
- `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`:
  Final 2,066 pass / eleven fail across 94 files (`ui-color-picker-integration-verified.log`). All
  eleven failures belong to File Upload, Tree and Transfer List. This remains a failed gate.
- `npm run typecheck`, focused `npx eslint` on the controller/public suite/browser fixture/spec, and
  `node scripts/quality/check-lint-boundaries.mjs`: pass in matching
  `ui-color-picker-*-verified.log` files. The first lint error was an unnecessary Window cast; the
  next TypeScript error required a DOM Window type for a numeric timer mock. The ratchet initially
  identifies a removed condition use; its allowance is removed, giving 339 TypeScript files / 300
  exact counts. All diagnostics remain preserved.
- `npx playwright test e2e/ui-document-ownership.spec.ts --grep 'Color Picker supports' --project desktop-chromium --project desktop-firefox --project desktop-webkit`:
  First 18 pass. A subsequent explicit-mode CSS-wide keyword negative fails all three engines
  (`ui-color-picker-browser-invalid-negative.log`). The complete command without the filter passes
  390 cases across 25 families, zero failures/skips/flakes. Isolated artifact paths are
  `ui-color-picker-browser-first/`, `ui-color-picker-browser-invalid-negative/` and
  `ui-color-picker-browser-verified/`; first/final input bindings verify 124 hashes and reports.
- The preceding Multi Select fast report `2026-09-19T18-23-02-300Z-98321` is terminal pass with six
  gates, 3,397 units and matching 905-file fingerprints, independently verified before this group's
  edits. The earlier spelling failure and intentionally interrupted run
  `2026-09-19T18-22-02-108Z-90261` remain preserved. This fast result is now historical. Current
  fast, actual npm run check and Code/Test closure remain pending while public failures remain.

The first refreshed `npm run quality:fast` report `2026-09-19T18-18-11-732Z-75373` passes five
gates, including all 3397 unit cases, but fails static spelling on five documentation occurrences.
Rewrite the prose using native opening event, option groups and explicit enhancement wording,
without dictionary exceptions. The failed report has matching 905-file fingerprints and remains
preserved. The corrected complete rerun follows the final documentation freeze; its raw log is
`ui-multi-select-fast-verified.log` and its exact report and fingerprint are bound in
`ui-lifetime-continuation-state.json`. Full delivery and the seven new ignored document-probe
failures remain open regardless of the fast result.

Multi Select checkpoint uses the same canonical Node 24.18.0/npm 11.16 PATH below. Logs are under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-choice-time-document.test.ts`: Expanded negative records 65 failures, 170
  passes and four fixture errors (`ui-multi-select-document-negative.log`). Complete nested native
  fixtures remove the errors while retaining 65 failures/170 passes
  (`ui-multi-select-document-negative-corrected.log`). Five later cases retain three continuation
  failures/two adoption controls (`ui-multi-select-followup-negative.log`). All negatives remain.
- `npx vitest run test/ui-choice-time-document.test.ts test/ui-multi-select.test.ts test/ui-choice-resource-lifecycle.test.ts test/ui-rendered-parts-lifecycle.test.ts test/ui-form-association.test.ts test/ui-transition-cancellation.test.ts`:
  Final 379 passes in six files (`ui-multi-select-focused-complete.log`). First implementation
  passes 367/fails seven, then preserving the native-part replacement contract and moving native
  FormData assertions to browsers passes 374 before the five follow-ups. These histories remain in
  the first/corrected logs.
- A native-only Playwright probe verifies Chromium, Firefox and WebKit all retain selected `a,b`
  while submitting only enabled `b` (`ui-multi-select-native-form-data-probe.log`). The new
  production browser fixture repeats that assertion alongside locked selection, tags and limits.
- Complete
  `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`:
  all 2,011 pass across 93 files (`ui-multi-select-integration-complete.log`).
- `npm run typecheck`, focused `npx eslint` on the controller/public suite/browser fixture/spec, and
  `node scripts/quality/check-lint-boundaries.mjs`: pass in the matching
  `ui-multi-select-*-complete.log` files. The ratchet has 338 TypeScript files / 301 exact counts.
  Its initial removed-use diagnostics remain in `ui-multi-select-ratchet-first.log`.
- `npx playwright test e2e/ui-document-ownership.spec.ts --grep 'Multi Select supports' --project desktop-chromium --project desktop-firefox --project desktop-webkit`:
  all 18 pass. The complete command without `--grep` passes all 372 across 24 families and three
  engines, zero failures/skips/flakes. Isolated `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY` paths are
  `ui-multi-select-browser-first/` and `ui-multi-select-browser-verified/`; matching `*-inputs.json`
  files verify 124 captured hashes and bind each report hash.
- The next ignored Color Picker/File Upload/Tree/Transfer List probe runs through its isolated
  config and records seven failures/one control without unhandled errors
  (`ui-color-file-tree-transfer-negative-corrected.log`). The first log predates an explicit Tree
  multiple-selection fixture correction and remains preserved. These failures are outside the
  passing installed public unit/browser cohorts and remain required audit work.

The broader family/host audit, fixed budgets, semantic source/claim review, actual npm run check and
Code/Test closure remain open. Ticket 0006 stays coding with AC-34 through AC-37 unchecked.

Combobox checkpoint uses the same canonical Node 24.18.0/npm 11.16 PATH below. Logs are under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-choice-time-document.test.ts`: First expanded negative has 65 failures and
  96 passes (`ui-combobox-document-negative.log`). Correcting the filtered-option/query fixtures
  gives 64 failures and 97 passes (`ui-combobox-document-negative-corrected.log`). Five follow-ups
  retain three new ArrowUp/model-write failures and two composition controls
  (`ui-combobox-followup-negative.log`). All original diagnostics are preserved.
- `npx vitest run test/ui-choice-time-document.test.ts test/ui-combobox.test.ts test/ui-choice-resource-lifecycle.test.ts test/ui-native-reset-lifecycle.test.ts test/ui-popup-lifecycle.test.ts test/ui-transition-cancellation.test.ts test/ui-identity-constraints.test.ts`:
  Final 321 passes/four failures across seven files (`ui-combobox-focused-verified.log`). All 70
  Combobox, 53 Select and 39 Time Picker public cases and the 159 existing focused cases pass. Only
  the four Multi Select public cases fail.
- Complete
  `test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`
  invocation with `npx vitest run`: 1,933 passes/four failures across 93 files
  (`ui-combobox-integration-verified.log`). The preceding run before the equivalent visibility
  predicate has the same counts (`ui-combobox-integration-complete.log`). Neither is a passing
  integration gate.
- `npm run typecheck`, focused `npx eslint` on the controller/public suite/browser fixture/spec, and
  `node scripts/quality/check-lint-boundaries.mjs`: pass in the corresponding
  `ui-combobox-*-verified.log` files. The immutable ratchet retains 338 TypeScript files / 302 exact
  counts and Combobox's existing one-condition allowance. Initial ratchet/condition diagnostics
  remain in `ui-combobox-ratchet-complete.log` and `ui-combobox-condition-diagnostic.log`; no
  allowance increase hides the failure.
- `npx playwright test e2e/ui-document-ownership.spec.ts --grep 'Combobox supports' --project desktop-chromium --project desktop-firefox --project desktop-webkit`:
  all 18 new cases pass (`ui-combobox-browser-first/results.json`). The final complete command
  without `--grep` passes all 354 across 23 families and three engines
  (`ui-combobox-browser-verified/results.json`), with zero failures/skips/flakes. Both runs use
  isolated `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY` paths; the matching `*-inputs.json` files verify all
  124 captured inputs and bind report hashes.

Multi Select retains four public failures. Current fast, actual `npm run check`, complete host and
family conformance, fixed budgets, semantic source/claim review and Code/Test closure remain open.
The preceding fast report and Select checkpoint remain historical evidence. Ticket 0006 remains
coding with AC-34 through AC-37 unchecked.

Select checkpoint uses the same canonical Node 24.18.0/npm 11.16 PATH below. Logs are under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-choice-time-document.test.ts`: Expanded negative suite fails 54 and passes
  41 of 95 (`ui-select-document-negative.log`). Restoring fault-injection mocks in `finally` removes
  the delayed MutationObserver diagnostic without changing those counts
  (`ui-select-document-negative-final.log`). The first fix leaves eight other-family failures and
  one overbroad fake-clock assertion (`ui-select-document-first-fix.log`). Binding the assertion to
  the actual typeahead/reset handles gives 87 passes/eight failures
  (`ui-select-document-fixed.log`).
- Three follow-up cases fail for empty selection, native popover cancellation and preserved native
  visibility (`ui-select-followup-negative.log`: 87 pass/11 fail). Two final cleanup-continuation
  cases also fail before their guards (`ui-select-cleanup-continuation-negative.log`: two fail, 98
  excluded by a name filter). All five are retained and corrected.
- `npx vitest run test/ui-choice-time-document.test.ts test/ui-select.test.ts test/ui-choice-resource-lifecycle.test.ts test/ui-popup-lifecycle.test.ts test/ui-native-reset-lifecycle.test.ts test/ui-floating-labels.test.ts test/ui-transition-cancellation.test.ts`:
  Final focused run passes 256 and fails eight across seven files
  (`ui-select-focused-complete.log`). All 53 Select and 39 Time Picker cases pass; only the eight
  open Combobox/Multi Select cases fail. The six existing files also pass separately with 164 tests
  in `ui-select-focused-first.log`.
- The complete UI/DOM/kernel/bridge/harness/declarative command recorded below passes 1,863 and
  fails eight across 93 files (`ui-select-integration-complete.log`). The earlier run before the
  final two guards passes 1,861/fails eight (`ui-select-integration.log`). Both are failed gates.
- `npm run typecheck`, focused `npx eslint` and `node scripts/quality/check-lint-boundaries.mjs`
  pass in the corresponding `ui-select-*-complete.log` files. The ratchet stays at 338 TypeScript
  files / 302 exact counts. Preserve earlier exact-optional-property, unnecessary test assertion and
  condition diagnostics. Callback-state guards now read current state through a helper instead of
  relying on TypeScript's stale property narrowing; Select keeps its existing two-condition
  allowance without increases.
- The first targeted three-engine Select browser command (`--grep 'Select supports'`) fails all 18
  only at preserved native popup visibility (`ui-select-browser-first/results.json`). The first
  corrected complete browser run passes all 336 with zero failures/skips/flakes
  (`ui-select-browser/results.json`), bound to 124 inputs. It precedes the final cleanup guards; the
  separately bound verified rerun also passes all 336 with zero failures/skips/flakes
  (`ui-select-browser-verified/results.json`). All 124 captured input hashes match at terminal. The
  command is
  `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY="$PWD/.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-select-browser-verified" npx playwright test e2e/ui-document-ownership.spec.ts --project desktop-chromium --project desktop-firefox --project desktop-webkit`.
  Session 42809 exits zero.

The Select/Time Picker fixes do not complete the four-family Plan. Combobox and Multi Select keep
eight public failures. Current fast, actual `npm run check`, complete host/family conformance, fixed
budgets, semantic source/claim review and Code/Test closure remain required.

Time Picker checkpoint commands use Node 24.18.0/npm 11.16 through
`PATH="/opt/homebrew/opt/node@24/bin:$PWD/.git/jqstar/tools/bin:$PATH"`. Logs below are under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/`:

- `npx vitest run test/ui-choice-time-document.test.ts` initially fails 46 and passes five of 51.
  `ui-choice-time-public-negative.log` preserves the first run, including the fixture's unintended
  jsdom form submission. Explicit button types remove that diagnostic without changing the 46/5
  outcome in `ui-choice-time-public-negative-final.log`. The first fix leaves 13 failures/38 passes
  (`ui-choice-time-first-fix.log`); correcting the explicit context-root selector removes the
  remaining Time Picker failure.
- `npx vitest run test/ui-choice-time-document.test.ts -t 'Time Picker|time-picker'`: 39 pass, 12
  excluded by the filter (`ui-time-picker-document-fixed.log`). This proves only Time Picker.
- `npx vitest run test/ui-time-picker.test.ts test/ui-choice-resource-lifecycle.test.ts test/ui-form-ownership.test.ts test/ui-native-reset-lifecycle.test.ts test/ui-rendered-parts-lifecycle.test.ts test/ui-transition-cancellation.test.ts`:
  All 189 tests in six files pass (`ui-time-picker-focused.log`).
- `npx vitest run test/dom-realm.test.ts test/ui-*.test.ts test/kernel.test.ts test/scoped-resource-lifecycle.test.ts test/bridge-disposal-lifecycle.test.ts test/turbo-bridge.test.ts test/htmx-bridge.test.ts test/testing-harness-conformance.test.ts test/declarative.test.ts`:
  1,810 pass and 12 fail across 93 files (`ui-time-picker-integration.log`). The twelve are the
  planned Select/Combobox/Multi Select foreign-target/adoption cases. This is a failed integration,
  not a passing gate.
- `JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY="$PWD/.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-time-picker-browser" npx playwright test e2e/ui-document-ownership.spec.ts --grep 'Time Picker' --project desktop-chromium --project desktop-firefox --project desktop-webkit`:
  All 18 pass, zero failures/skips/flakes. `ui-time-picker-browser-inputs.json` binds 124 verified
  inputs and the report hash. The preceding 300-case group predates these source/fixture changes.
- `npm run typecheck`, focused `npx eslint` on the source/test/browser files and
  `node scripts/quality/check-lint-boundaries.mjs` pass in `ui-time-picker-*-final.log`. Initial
  lint/ratchet diagnostics reject an unnecessary test-only generic, removed without a waiver. The
  unchanged ratchet passes 338 TypeScript files / 302 exact file/rule counts.

Fast `2026-09-19T17-18-21-470Z-45288` is now historical. Current fast, the full browser group,
actual `npm run check` and Code/Test closure remain pending; the current public suite has the twelve
open failures above. The ticket remains coding and AC-34 through AC-37 remain unchecked.

The September 17 public Message Scroller probe extends the pending generic ownership finding: after
public removal or connected kernel disposal, its native MutationObserver still emits messages and
schedules a timeout. Firing that timeout after connected disposal scrolls and emits latest. The
detached-root check only suppresses scrolling. The retained report is
`quality-refresh-2026-09-17/message-scroller-removal-before.json`. Common contract owner 0016
returns to Plan; the generic correction must cover observer and callback ownership as well as the
Countdown/Carousel timers already reproduced.

| Command                | Result | Evidence                                                                                                                                 |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` | Pass   | `2026-09-17T15-11-06-759Z-44572`: all six gates and all 2,035 cases pass. Actual Code validation passes before these phase/ledger edits. |

| Command                | Result | Evidence                                                                                                                                                                                                                                                           |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run quality:fast` | Pass   | Report `2026-09-08T17-53-01-144Z-11475` matches the resumed tree. Actual Code validation passed on September 17 before phase edits.                                                                                                                                |
| `npm run check`        | Error  | Run `2026-09-17T14-37-33-953Z-21874` passed 2,005 units, coverage and properties. Ticket ledger/format and dependency-audit failures prevented closure; deliberate interruption records remaining gates as errors. Dependency correction belongs to reopened 0052. |

### Resumed verification (2026-09-17)

Current fast `2026-09-17T14-47-02-447Z-70212` passes all six gates and 2,005 unit cases after the
0052 tool update and 0031 installed-evidence refresh. Actual Code validation passes again before
this update. The generated UI warning line now uses LF termination to satisfy `git diff --check`;
its report text and declarations are unchanged.

A second public-API probe confirms the generic cleanup gap also affects Carousel. Its autoplay
timeout survives render removal and connected kernel disposal. Running that timeout changes the
slide, emits a change event and schedules another timeout even after removal/disposal. The
preserved-root control continues its intended playback. Source hashes and exact observations are in
`quality-refresh-2026-09-17/carousel-removal-before.json`. This unresolved finding belongs with the
Countdown cleanup Plan; the current green batch does not claim to fix either resource lifetime.

The saved fast report `2026-09-08T17-53-01-144Z-11475` still matches the current tree. Actual
Code-phase validation passes against that report on September 17 before this phase update. No
repository quality process survived the interrupted session. Run `npm run check` on this batch
before extending the Plan for the unresolved generic UI removal/disposal finding below.

The normal root declaration/API rerun passes after the exact generated warning-location update.
Current root fast and complete delivery follow. A separate public resource probe remains unresolved:
Countdown retains its interval after render removal until a detached tick and after kernel disposal
while connected. `ui-removal-contract-before.json` records the failure and preserved-node control.
This owner must resolve the generic UI lifetime gap before Document closure, with common contract
0016 and both bridge matrices providing corresponding evidence. The current part/label batch does
not claim to fix it.

Normal root ESM/UMD build passes at the same measured sizes as the isolated checkout. The first
normal API check stops because the existing forgotten-export diagnostic moved from UI source line
610 to 583. The generated root report has no signature change; copying that exact relative-path
report updates `etc/jquery-star-ui.api.md`, and the declaration/API command is rerun. This failed
build remains in `final-ui-root-build.log`; follow-up evidence is `final-ui-root-types-api.log`.
`final-ui-root-size.json` records current hashes. Mobile's measured UMD metadata changes from
463,274 to 462,311 bytes without a budget increase.

Current isolated source-pass evidence: all 525 UI cases across 67 suites pass after the final
captured-Popover ownership guard and preserved initial ID suffixes. The unchanged repository
evaluator accepts every changed executable line and function in all thirteen modules. These focused
artifacts exclude the complete production denominator and delivery receipt; normal root delivery is
required. Evidence: `final-ui-coverage-final.log`, raw `final-ui-coverage/`, and
`final-ui-changed-coverage.json` under the current ownership-census resume directory.

Current test types, focused lint, and the exact source-boundary comparison pass. The isolated
checkout has 315 TypeScript files and 304 existing file/rule entries, with no added allowance. Root
separately removed the obsolete Mobile-test allowance under owner 0040; that reduction must survive
integration. The first type pass rejected iframe Window typing, corrected with an explicit DOM-realm
intersection. The first lint pass rejected four return-only generic fixture helpers, corrected with
concrete element returns and native fixture casts. Both original logs remain available.

Current builds measure UI ESM at 317,243 bytes, UI CommonJS at 316,105 bytes, and UMD at 462,311
bytes; all fixed limits hold. Declaration generation and isolated API extraction pass. The API diff
is only the existing forgotten-export warning's source location, with no public signature change.
Normal root build must regenerate its relative path. `final-ui-size-final.json` records exact
artifact hashes. Earlier intermediate sizes, failures, and passing controls remain retained. Root
Plan, integration, current fast/Code, full delivery/Test, and Document closure remain separate
requirements.

| Command                                                                    | Result | Evidence                                                                                                          |
| -------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `npm run check` / `quality:delivery`                                       | Pass   | `2026-09-08T16-53-32-481Z-44155/report.json`: all 13 gates and matching 876-file fingerprint; authorized receipt. |
| `npm run ticket:validate -- --phase test` with this ticket and that report | Pass   | Executed before tracked edits; exact report and current receipt accepted.                                         |

Current delivery `2026-09-08T16-53-32-481Z-44155` passes all 13 enforced gates, including 1,940 unit
tests, 487 browser cases, changed-code coverage, 13 package checks, seven release checks and
detector self-tests. The 876-file start/end fingerprint is
`fc83d419cf48f197ce5fdab3c7416496f170c728da128418fbd8ff51c2f911db`. Actual Test validation passed
against its authorized receipt before subsequent tracked edits; `ui-expanded-test-0006.log` records
that command under the ownership-census evidence directory. Earlier delivery failures below remain
historical evidence. This run excludes the separate bridge corrections and the final source-pass UI
findings.

Fast `2026-09-08T16-44-51-096Z-4393` passes all 1,940 unit tests and five of six gates. Static-fast
passes every analyzer except a spelling diagnostic in this ticket's pointer-event prose. Use plain
event descriptions without changing runtime behavior or the spelling dictionary, retain the failure
and rerun current fast verification before Code validation. The first retry
`2026-09-08T16-47-21-686Z-17481` repeats the same spelling failure because the initial edit targeted
a quoted token while the source used plain prose. The exact text is corrected before the next run.

The integrated root passes all 25 cases in `sortable-nested-focused.log`, including twelve Sortable
lifecycle cases, four original Sortable cases and nine Form association cases. The new nested
ownership tests produce four failures before correction and five passes after it. Root JavaScript,
type and API build passes (`sortable-nested-root-build.log`): UMD 463,274 bytes, UI ESM 318,227 and
CJS 317,074, within unchanged limits. The Mobile measurement is updated from the actual build.
Standard root lint boundaries pass for 310 TypeScript files and 304 exact file/rule counts. Current
combined fast/Code and complete full/Test verification remain required.

The predecessor root `quality:delivery` (`npm run check`) ends with 12 of 13 gates passing in
`2026-09-08T16-15-36-329Z-39703/report.json`: all 1,886 unit tests, 487 browser cases, 13 package
checks, seven release checks and detector self-tests pass. Only Form's unused cleanup line and OTP
native fallback/cancellation/focus coverage fail. Start/end 871-file fingerprint is
`e402e829bac05abe9ea048f0ecb25c390e8723b6466845e9289969b74ea460dc`. The root freeze is lifted; no
Test closure or receipt is claimed from that failed run.

The final isolated coverage set passes 119 cases across 17 suites, including
browser-already-released pointer capture. Before that case, the unchanged repository changed-code
evaluator flags Resizable's relocated capture-release catch path; both failure and correction remain
recorded. The current `ui-expanded-changed-coverage-capture.json` reports all changed
lines/functions covered across nine selected UI modules using raw coverage and the actual HEAD diff.
This focused evaluation does not supply the complete production denominator, test roster, threshold
ratchet or delivery receipt.

Sortable Plan passes before source edits (`sortable-plan.log`). Original source fails six of seven
cases (`sortable-negative.log`); current results are retained in `sortable-focused.log`. The
preceding isolated boundary probe passes 309 TypeScript files and 304 exact file/rule counts
(`ui-next-boundary-probe.json`) using the repository comparison logic and immutable HEAD; this
focused probe avoids development-directory symlinks and is not a runner receipt.

Transition-cancellation Plan passes before source edits. Six of seven new cases fail original source
(`transition-cancellation-negative.log`); the corrected combined set passes 97 cases across ten
suites (`transition-cancellation-focused.log`). The final isolated coverage run after formatting
passes 84 cases across eleven suites (`ui-next-coverage-final.log`). It includes a later Resizable
live-size/current-constraint case beyond the initial 13-case negative roster. OTP lines 69, 174 and
310 have 752, one and four statement hits, and both named focus callbacks execute. Root's complete
coverage failure remains historical evidence; these focused results do not authorize delivery.

Resizable/Transfer Plan passes before source edits (`resizable-transfer-plan.log`). Original source
fails all 13 new cases (`resizable-transfer-negative.log`); the corrected expanded set passes 84
cases across eight suites (`resizable-transfer-focused.log`). The preceding isolated coverage set
passes all 59 cases across seven suites, including the new OTP public branches and Form cleanup
removal (`form-otp-feed-scroller-coverage.log`). That focused coverage is not the complete
changed-code delivery gate. Root remains on its unchanged live predecessor.

The isolated Feed/Message Scroller Plan passes before source edits (`feed-scroller-plan.log`).
Original source fails 11 of 17 new cases (`feed-scroller-negative.log`). The corrected focused set
passes 86 cases across seven suites (`feed-scroller-focused.log`), and focused lint passes. Initial
TypeScript checking rejects a test matrix inferred as variable-length arrays; a readonly tuple
assertion corrects that fixture type. The failed type output is retained. Root delivery is still
running on the preceding tree and excludes these isolated changes.

The integrated Form/floating set passes 61 cases in `form-floating-focused.log`; production types
pass. Initial focused lint rejects eight non-null assertions in new fixtures; explicit fixture
checks correct them and `form-floating-lint-final.log` passes. Exact boundary verification passes
for 305 TypeScript files and 304 immutable-base file/rule counts (`ui-batch-root-boundaries.log`).
`form-floating-build.log` passes the complete root JavaScript, declaration and API build. UMD is
463,042 bytes, UI ESM 317,980 and CJS 316,842 (`form-floating-size.json`) within unchanged budgets.
The Mobile measurement matches; current fast and full delivery are still required.

Form/floating-label Plan passes in `form-floating-plan.log` before source edits. Original source
fails 16 of 23 new cases (`form-floating-negative.log`); seven controls pass. The first integrated
root build fails only on the existing UI API diagnostic location; source API signatures are equal.
The planned snapshot refresh preserves that failure history in `ui-batch-root-build.log`.

The predecessor root `quality:delivery` (`npm run check`) ended with 12 of 13 gates passing in
`2026-09-08T15-44-03-102Z-62441/report.json`. All 1,832 unit tests, 487 browser cases, 13 package
checks, seven release checks and detector self-tests pass. Only changed-function coverage fails on
Editable's unused placeholder cleanup. The start and end 866-file fingerprint both equal
`3754a3f22d13abdb7d367e8b16414ab0720f14d9f0a9cb2e950482192abef0a4`. The failure is retained; it
authorizes no Test closure or receipt. The root freeze is lifted before this planned integration.

Input OTP/Tags Input Plan validation passes before source changes. Original source fails nine of ten
new cases (`otp-tags-negative.log`). The corrected focused set passes 97 cases across eleven suites
(`otp-tags-focused.log`), focused lint passes, and ESM/CJS builds pass with UI ESM at 318,022 bytes
and CJS at 316,884 within unchanged limits. Public event assertions preserve the OTP `control`
field. Complete current root verification remains required after selective integration.

The isolated Tabs/Dialog Plan passes before source edits. Original source fails nine of 11 new cases
(`tabs-dialog-negative.log`), while the corrected focused set passes 96 cases across nine suites
(`tabs-dialog-focused.log`) and focused lint passes. ESM/CJS builds pass with UI ESM at 318,256
bytes and CJS at 317,118, within unchanged limits. This batch includes the earlier isolated
Countdown and Editable placeholder-cleanup corrections. The latter two also pass 35 focused cases
with 100% function coverage in both modules (`countdown-editable-coverage.log`) and production
types. This focused coverage is not the complete delivery/changed-code gate.

Countdown Plan validation passes in the current-tree isolated checkout before source edits.
`countdown-negative.log` retains eight failed and two passing regressions. The corrected
`countdown-focused.log` passes 101 cases across ten suites, and `countdown-lint.log` passes.
Separate Vite ESM/CJS and UMD builds pass: UI ESM is 318,321 bytes, UI CJS 317,183 and UMD 463,386,
inside unchanged limits (`countdown-size.json`). Root still runs full delivery on its 463,412-byte
predecessor; do not update its measurement or copy changes while that run is live. The first
artifact/document update attempted to treat the isolated checkout's `.git` pointer as a directory
and stopped before documentation writes; the corrected command writes artifacts to the root audit
directory. Current root type/API, fast/Code and full/Test remain required after integration.

| Command                                                                                | Result | Evidence                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                                 | Pass   | `2026-09-08T16-50-37-681Z-30674/report.json`: all six gates and 1,940 unit tests pass on matching 876-file fingerprint `33b30c7f70d1a19d422fc7e11c5860120726770307e957b4a98d2c6220548095`. Actual Code validation passes before tracked edits. |
| `npm run ticket:validate -- --phase code` with this ticket and the current fast report | Pass   | Executed against that exact report before subsequent tracked status/documentation edits.                                                                                                                                                       |

The fast report below preceded the passing delivery above. Older passing delivery rows refer to
their recorded predecessor trees.

The final Disclosure/Editable correction passes 95 focused cases across 10 suites, focused ESLint
and the complete root JavaScript/type/API build. The lint-boundary checker passes after reducing
JSON Viewer's exact allowance. Evidence: `disclosure-editable-final-{focused,lint}.log`,
`disclosure-editable-typed-build.log`, `viewer-boundaries.log` and `disclosure-editable-size.json`.
UMD is 463,412 bytes, UI ESM 318,347 and UI CJS 317,209, within unchanged limits; the Mobile
reference measurement records current UMD. The intermediate second build also reached declaration
generation before the explicit cleanup return annotation was in place, so retain its failure
alongside the first. Current fast/Code and full/Test remain required.

Disclosure/Editable Plan validation passes before changes. Original source fails 12 of 14 new cases
(`disclosure-editable-negative.log`). The first corrected focused set passes 95 cases across 10
suites, but review catches a public event-field rename. New assertions reproduce seven failures
before restoring `control` (`disclosure-editable-event-negative.log`). The initial JavaScript build
succeeds but declaration generation finds a circular inferred cleanup return type. Add an explicit
`void` annotation to the initializer callback; rerun the complete type/API build. Preserve all
intermediate logs and avoid accepting the first build or pre-event-assertion run as final proof.

Viewer fast `2026-09-08T15-35-01-663Z-34774` passes all 1,818 units and five of six gates on
matching 865-file fingerprint `d2f094eb8aca0a240b55a9ca4610b9d79b966ef179b2a7e440733c60df3b9024`.
Static-fast fails only because JSON Viewer's recorded redundant-condition count is three but the
corrected source has two. Reduce that exact allowance. The subsequent Disclosure/Editable probes
return this owner to Plan before correction; no current Code/Test closure is claimed.

The final viewer correction passes 198 focused UI/patch/behavior cases across 20 suites, focused
ESLint and the complete root JavaScript/type/API build. UMD measures 463,500 bytes, UI ESM 318,435
and UI CJS 317,297, within unchanged limits. `quality/jquery-mobile-migration.json` records the
current UMD. Evidence: `viewer-final-{focused,lint,build}.log` and `viewer-size.json` in the current
ownership audit directory. The initial 177-case expanded run omitted `test/patch.test.ts` because
the supplied path was `test/patch-lifecycle.test.ts`; the final 198-case run uses the real suite.
The second measured build still exceeded UI ESM by 32 bytes. Equivalent record assignment and an
inlined single-use scroll helper remove that excess without changing any public API or budget.
Current fast/Code and full/Test evidence remain required.

Viewer Plan validation passed before tests/source changes. `viewer-negative.log` retains 17 failed
and two passing new cases. `viewer-focused.log` passes all 32 viewer cases and focused ESLint
passes. The first full JavaScript/type/API build succeeds but measures UI ESM at 318,539 bytes, 75
above the unchanged 318,464-byte limit. Preserve `viewer-first-size.json` and
`viewer-first-build.log`; simplify equivalent private record bookkeeping and remeasure before
claiming the size contract passes. Current full delivery remains required.

Fast `2026-09-08T15-23-06-500Z-18189` passes all six gates and 1,799 unit tests with matching
start/end fingerprint `cefc5c153a44658680f8e83177a4a8dbb8de921e40ee2171f67a33ca6654be91` across 864
files. It verifies the integrated Number Field predecessor. The subsequently confirmed viewer
defects return owner 0006 to Plan; no Test/Document closure is claimed from it.

Number Field's current correction passes 166 focused cases across 17 UI/patch/behavior suites and
focused ESLint. The complete root JavaScript/type/API build passes. UMD is 463,503 bytes; UI ESM is
318,438 and CJS 317,300 bytes, within unchanged limits. The Mobile reference evidence now records
the actual current UMD. Public component, ownership and testing documentation describe current-part
binding and inert detached events. Current fast/Code and complete delivery are still required.

Fast `2026-09-08T15-16-15-237Z-3790` passes all six gates and 1,794 unit tests with matching
start/end fingerprint `61e8b127bd379850235fb40c0799df8b3aa0a0c9f7ec6a090613d85ba28eb8e0` across 864
files. This establishes the queued-reset correction's fast baseline. Number Field's subsequently
confirmed replacement defect returns this owner to Plan; no Test or Document closure is claimed from
the passing predecessor report.

Current root `npm run build:js` passes, including declaration generation and every API extraction.
UMD is 463,437 bytes, UI ESM 318,372 and CJS 317,234 bytes, each within its unchanged limit. The
Mobile reference measurement now matches that root artifact. Focused lint and all 158 UI/patch/
behavior cases pass. Explicit source review refreshes the three reset guards; claim review adds
three reset units and verifies two formatter-only paragraph changes. Current fast/full checks
remain.

The queued-reset correction passes all 158 focused cases across 16 UI/patch/behavior suites. Its
three new replacement cases fail original code; all ten other cases in that test file pass before
the fix. Current controllers still reset native values across unchanged enhancement. The earlier
five-file Markdown formatting failure is corrected with the repository formatter. A current root
build, measured UMD update, fast/Code and full Test verification remain required.

Root fast `2026-09-08T15-09-05-176Z-88743` passes all 1,788 units and static checks, but formatting
fails on five edited Markdown files. The run retains identical start/end fingerprint
`877c1d5d063178e56ed9e1fb83becea3955ecdf61856de1dc534b8d673797dcd` across 864 files. It grants no
Code closure. Format those documents and include the newly confirmed queued-reset correction before
repeating fast verification; retain the complete failed report.

The form/rendered-part follow-ups are now integrated into the root after actual Plan validation. The
current sources, two new test files and three component/ownership/testing documents match the
verified isolated checkout. Final isolated UMD is 463,352 bytes; the Mobile reference evidence now
records that measurement within its unchanged 464,896-byte limit. Root fast/Code and full Test
verification remain pending.

Completed delivery `2026-09-08T14-46-59-585Z-27573` retained identical start/end fingerprint
`c96f03f921f8d4f4c61a491be3bbb4e464a3f10fc2fd96b33b7749d7ed17b9cb` across 862 files. It passes 1,740
units, coverage, property, static checks, all 487 browser cases and release checks. Package
validation and the package-budget detector fixture fail because the Mobile UMD evidence says 462,807
bytes while that run built 462,934. This report has no delivery receipt and does not cover the later
six-source form/rendered-part follow-up. Preserve its complete failure evidence.

The expanded focused lint passes. Documentation spelling passes; markdown validation found five
extra blank-line errors in the edited docs/ticket and one inherited temporary-store-ticket error.
All were formatting-only and corrected in the temporary checkout; the latter file is excluded from
selective integration. ESM UI is 318,287 bytes and CJS UI 317,149 bytes, each below the unchanged
318,464-byte limit. The final UMD build and current root package proof remain separate checks.

The complete focused UI/patch/behavior set now passes 152 cases across 16 suites, including all 41
form-owner and seven rendered-part cases. Source corrections and current documentation are prepared
in the separate checkout while the root delivery completes. Exact root fast/Code and full
coverage/package/browser proof remain required after selective integration.

The form correction now passes all 82 cases across nine focused suites; its 41 new cases include
both failing original behavior and the existing Select/Combobox controls. Focused lint passes after
removing forbidden non-null assertions and redundant fixture guards. The first temporary typecheck
could not resolve the private resource-research dependency; linking the already prepared dependency
makes that checkout match the root dependency layout. Both failed logs remain in the audit record.
The current root delivery also reports a stale Mobile UMD byte measurement. Extend the existing
`quality/jquery-mobile-migration.json` changed-file ledger to record the final measured artifact
size without changing its fixed budget; use the final integrated build and package check for proof.

The first form-ownership correction passed 81 of 82 focused cases. Its remaining case exposed a
regression in the proposed fix: recreating a controller only because the form changed reapplied the
old reflected value. Keep the controller for unchanged parts and rewire its binding in place; this
preserves the existing native-value behavior. The failed focused log remains retained.

| Current command                                                     | Result | Evidence                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                              | Pass   | `2026-09-08T14-42-18-303Z-14009/report.json`: all six gates and 1,740 unit tests, matching 862-file fingerprint `ee02f19e72e485fb25795e93035cc0894db55fdcfcc967026c12f5828bdb196e`. |
| `npm run ticket:validate -- --phase code` against that exact report | Pass   | Executed successfully for owners 0006, 0019 and 0035 before these Test-phase documentation updates.                                                                                 |

Current complete delivery remains required. Earlier receipts and failures remain below.

Root fast `2026-09-08T14-39-06-209Z-309` passes all 1,740 unit tests, workflow, formatting and
runner checks. Static verification fails two documentation checks: duplicate historical completion
headings and an unrecognized plural in this Plan. Distinguish the original/prior correction audits
and use "textarea controls". Preserve this failed report; current fast/Code and delivery remain
required.

The validated UI correction is integrated after delivery `2026-09-08T14-15-52-232Z-38476` ends. That
earlier root run passes all 13 gates on one unchanged 862-file fingerprint, but excludes the UI
changes and later facade cleanup. Current root fast/Code and complete delivery are required. The
integrated ledger includes the four UI source/test pairs and the component/ownership/testing guides
described in Plan; the separate checkout's older unrelated files were not copied.

The Code Block extension validates Plan before code and adds two original-source failures. Reusing
the root's record with refreshed code/status references makes both pending success/error cases pass,
including original copied text and an untouched detached status. The final focused UI/code-block/
patch/behavior run passes 63 cases in six suites; focused ESLint passes. Evidence remains under
`/tmp/jqstar-code-block-negative.log`, `/tmp/jqstar-ui-expanded-final.log` and
`/tmp/jqstar-ui-lint-final.log`. This extension also changes `src/ui/code-block.ts` and
`test/ui-code-block.test.ts`; the component, ownership and testing docs include its guarantee. The
earlier 219-case coverage/build measurements predate this final Code Block change. Fresh root
coverage, installed-package and complete delivery remain required after integration.

Current isolated UI verification (2026-09-08): a broader run passes 54 UI/code-block/patch cases in
five suites; its unused `test/lifecycle.test.ts` filter matched no file and receives no credit. The
subsequent exact coverage configuration includes the actual `test/behavior-lifecycle.test.ts` and
passes 219 combined cases in 14 suites. Runtime builds remain within existing UMD and UI limits.
Installed-package and complete delivery evidence remain pending.

Current isolated initial UI verification (2026-09-08): Plan and its optional-status clarification
validated before code. Original UI source fails 11 of 27 focused cases in
`/tmp/jqstar-ui-parts-negative.log`. After correction all 27 pass in
`/tmp/jqstar-ui-parts-after.log`: replaced parts, old-node listener release, unchanged-tree
behavior, canceled Chart retries and clipboard selection/copy failure cleanup. Focused ESLint also
passes. The retained public after-probe shows current password controls working while the detached
original stays unchanged, and a replacement Chart plot rendering during enhancement without explicit
refresh. Full current coverage, package, fast/Code and delivery evidence remain required after root
integration. Earlier evidence below is historical.

| Command                                                              | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (invokes `quality:delivery`) | Pass   | `2026-09-07T01-53-29-076Z-39380/report.json`: all 13 enforced gates pass with matching 858-file fingerprint `c053e7f45e868a3f5e29824b29610eeaaec1da8b27f97ada8b4a51b834691121`. All 1,642 unit tests, 487 browser tests, 13 installed-package checks, seven release checks and 16 detector controls pass. Coverage reports no uncovered changed executable lines or functions in the nine changed runtime files. |
| Installed package sizes from that delivery run                       | Pass   | `package-report.json`: testing CommonJS/ESM are 12,975/12,988 bytes, core consumer is 62,991 gzip bytes and CSP consumer is 38,983 Brotli bytes. Existing 13,000/63,000/39,000 limits are unchanged.                                                                                                                                                                                                             |
| Actual Test phase validation for owners 0006, 0009 and 0014          | Pass   | `ownership-census/current-batch-test-validation.log`: all three validators pass against that exact delivery report before moving to Document. The final documentation and status changes require a new matching delivery receipt before commit.                                                                                                                                                                  |

Fast run `2026-09-07T01-35-41-017Z-92774` passes all six gates and 1,638 unit tests with matching
858-file fingerprints. Actual Code validation passes against that exact report before this ticket
returns to testing. The current built consumer preview measures core gzip 62,991 and CSP Brotli
38,983 bytes within unchanged limits. Current installed-package execution, changed-code coverage and
complete delivery remain required; the preview and fast result are not a receipt.

The actual combined package build passes. Its UMD is 463,263 bytes with digest
`eed0b10aebd1e38a5578449dbe5dbf8ee609c3348c0fefc4eb436002d1946f4b`; only the corresponding existing
Mobile reference measurement is updated. The build does not establish installed consumer budgets or
delivery acceptance, which remain required.

The detached declarative correction passes 88 focused tests across five lifecycle/patch suites.
Against the unchanged source, four teardown regressions fail while the scoped live-sibling control
passes. The first negative run also contained an invalid patch call in that control; its corrected
unchanged-source run isolates the four actual failures. Both reports remain retained. Focused ESLint
and agent generation pass. Current fast, coverage, actual package budgets and full delivery remain
required.

Delivery `2026-09-07T01-23-08-047Z-63863` was deliberately stopped after the current-source detached
declarative defect was reproduced. Workflow, runner checks, dependency preparation, formatting,
1,628 unit tests and delivery static analysis pass. Coverage is interrupted and later gates are
unexecuted errors. The report records SIGTERM with matching fingerprints and no receipt. The
original public probe records zero cleanup calls in both teardown modes; application-only
destruction still permits a window event to change state, while kernel disposal leaves an event that
calls a disposed expression engine. Preserve that failure before the planned correction.

Fast run `2026-09-07T00-57-56-093Z-17895` passes all six gates and all 1,628 unit tests with
matching 856-file fingerprint `9cd1068e1a3d9f000298a21f3d1253d7b8bd71cbebc7e5dc643895c5d5091ecd`.
Actual Code validation against that report passes before moving to testing. The build and focused
ESLint checks pass. The new test's initial twelve forbidden non-null assertions were replaced with
an explicit required-value guard without changing lint rules. The rebuilt UMD measures 463,255 bytes
and the Mobile reference records that measurement. A consumer preview measures core gzip 62,998
within 63,000, but CSP Brotli 39,055 exceeds 39,000. Preserve that preview and resolve the remaining
package limit before current installed-package, coverage and complete delivery acceptance.

The new `test/behavior-lifecycle.test.ts` fails all seven cases against the unchanged runtime. After
the correction, five focused suites pass all 116 tests, including all seven regressions. They
observe initial binding/model/event teardown, initial/dynamic mount destruction, a throwing returned
cleanup, node removal before application/kernel destruction, and a mount that removes its own
subtree while the application remains alive. Raw negative and passing JSON/logs are retained as
`ownership-census/behavior-lifecycle-{negative,focused}.*`. Fast, coverage, package and full
delivery remain required for this source correction.

Corrected size-refactor coverage passes: all 125 changed executable lines and 25 changed functions
are covered, with zero uncovered or unexplained changes and all 28 executed requirement mappings
satisfied. Global/subsystem floors and the immutable threshold comparison pass. Raw reports and all
30 unchanged input hashes are preserved in `ownership-census/package-size-coverage-passed/`. This is
standalone coverage evidence; package-size failures and complete delivery remain open.

The first size-refactor coverage run fails only because `src/fetch.ts:91` lacks a hit for nested
request-state path initialization. Tests, global/subsystem floors, immutable threshold comparison
and all 28 executed requirement mappings pass. Raw evidence is preserved in
`ownership-census/package-size-coverage-failed/`. A public nested pending/error case is planned
before the corrected rerun; no allowance or denominator change is approved.

The standalone installed-package follow-up fails two of thirteen checks. Core raw/gzip assertions
now pass before the CSP assertion fails at 39,046 Brotli bytes against 39,000. Packed size is
3,176,621 bytes against the combined 3,174,000-byte allowance. API/types, installed consumers,
QUnit, three-browser consumers, Mobile UMD measurement and registry checks pass. The report is
retained at `ownership-census/package-size-installed/package-report.json`, with all 29 changed input
hashes unchanged during execution. Further build-size correction and complete delivery remain
required.

Package-size follow-up: the seven focused suites pass 153 tests with no failures or pending tests.
`npm run build` passes JavaScript, declaration/API and CSS generation. Fast run
`2026-09-07T00-13-54-546Z-15329` passes all six selected gates and 1,620 unit tests on unchanged
fingerprint `629cc01ec800fbb83a349344f00162fe527fa62685ca4c7cfa4949833164c4ca` (856 files). Actual
Code validation passes before returning to testing. These checks cover the shared copy boundary and
existing application, directive, request and patch behavior. This phase/evidence edit follows that
fast run; changed-code coverage, installed-package and full delivery remain required.

| Command                                         | Result | Evidence                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` (built-in correction)    | Pass   | `2026-09-06T23-54-22-242Z-93737/report.json`: all six gates and 1,618 unit tests pass with zero failed/pending cases and unchanged 856-file fingerprint `ce08adb4…e49f0`.                                                                                                                                                   |
| `npm run test:coverage` (built-in correction)   | Pass   | `ownership-census/builtin-registration-coverage/verification.json`: 104 changed executable lines and eighteen changed functions covered, zero uncovered/unexplained changes, and all 28 executed requirement mappings pass. Raw reports and input hashes are preserved. This standalone check supplies no delivery receipt. |
| Actual Code phase validation                    | Pass   | `ownership-census/builtin-registration-code.log`; validated the exact passing fast report before returning to testing.                                                                                                                                                                                                      |
| Focused built-in and directive/lifecycle suites | Pass   | `ownership-census/builtin-registration-focused.json`: 108 passing tests across four suites, including the three previously failing built-in paths and active/registered controls.                                                                                                                                           |
| Fresh source-bundled public probes              | Pass   | `builtin-effect-reentrant-after.json` and `model-reentrant-after.json`: zero retained effects, no post-destruction evaluation or model state/DOM writes. This is source proof, not installed-package acceptance.                                                                                                            |

Combined delivery failure (2026-09-06).

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

| Command                                                      | Result | Evidence                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:coverage` (response and lifecycle corrections) | Pass   | `ownership-census/lifecycle-and-response-coverage/coverage-gate.json` and retained raw reports: all 35 changed executable lines and eight changed functions are covered across fetch, runtime and response fixtures; global/subsystem thresholds and all 28 required evidence mappings pass. This standalone gate supplies no delivery receipt. |

| Command                                                     | Result | Evidence                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run quality:fast` (response and lifecycle corrections) | Pass   | `2026-09-06T23-15-18-323Z-88354/report.json`: all six selected gates pass, 1,600 unit tests pass with zero failures/pending cases, and start/end fingerprint `6c42ce5b…e795` matches across 856 files. |
| Code phase validation against the exact passing fast report | Pass   | Actual phase validation passes before moving to testing. Full delivery and final acceptance remain required.                                                                                           |

| Command                                 | Result | Evidence                                                                                                                                                                            |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation            | Pass   | Required decisions and planned files passed before source edits.                                                                                                                    |
| `npm run typecheck`                     | Pass   | Runtime, tests, registry declarations, and `whenEnhanced` types compile.                                                                                                            |
| Focused lifecycle suite                 | Pass   | 130 tests cover reactivity, kernel, behavior/declarative apps, patches, HTML fetches, and Datastar SDK paths.                                                                       |
| First `npm run test:unit`               | Fail   | All 448 behavior tests passed. API Extractor rejected the intentional unreviewed `whenEnhanced` signature. The reviewed one-member diff was accepted into `etc/jquery-star.api.md`. |
| Focused Chromium render proof           | Pass   | One real-browser test proves MutationObserver delivery, nested connected cleanup order, directives, and dialog ARIA enhancement.                                                    |
| `npm run quality:fast`                  | Pass   | Report `2026-09-01T00-34-21-221Z-15576` passed 5 gate groups: ticket workflow, runner self-test, formatting, 450 unit tests, and all 22 fast static analyzers.                      |
| Code-phase ticket validation            | Pass   | Ticket 0006 passed against the exact fast-report worktree fingerprint.                                                                                                              |
| First `npm run quality:delivery`        | Fail   | Report `2026-09-01T00-35-32-380Z-23294` exposed incomplete coverage, mutation escapes, fixed bundle-budget overruns, and the dependent package self-test failure.                   |
| `npm run test:coverage`                 | Pass   | The changed lifecycle kernel reached 100% statements, branches, functions, and lines. The repository coverage gate passed.                                                          |
| `npm run test:mutation`                 | Pass   | The changed-scope gate passed at 99.58% with 1,173 killed mutants, 5 survivors, 0 uncovered, and 0 timeouts.                                                                        |
| Lifecycle-only mutation rerun           | Pass   | `src/runtime.ts` and `src/declarative.ts` both reached 100% after removing duplicate cancellation and adding the exact aggregate-message assertion.                                 |
| `npm run test:package:quality`          | Pass   | All 13 installed-package checks passed. ESM is 393,464 bytes and UMD is 391,828 bytes, both within their fixed budgets.                                                             |
| Second `npm run quality:fast`           | Fail   | Report `2026-09-01T02-01-31-658Z-86448` found one stale import and one deprecated test type reference. Every other gate passed.                                                     |
| Third `npm run quality:fast`            | Pass   | Report `2026-09-01T02-02-54-701Z-94178` passed ticket workflow, runner self-test, formatting, the complete unit suite, and all 22 static analyzers.                                 |
| Second `npm run quality:delivery`       | Fail   | Report `2026-09-01T02-04-05-790Z-2128` passed 12 of 13 gates. Firefox exposed outer-before-inner application destruction in the render browser contract.                            |
| Focused Firefox and WebKit render proof | Pass   | Both engines destroy the inner root before the outer root and complete incoming enhancement after the three-way comparator fix.                                                     |
| Kernel-only mutation rerun              | Pass   | All 118 viable kernel mutants were killed, including both containment directions in `compareElementDepth()`.                                                                        |
| Third `npm run quality:delivery`        | Pass   | Report `2026-09-01T02-28-07-397Z-32444` passed all 13 enforced delivery gates against one unchanged worktree.                                                                       |
| Test-phase ticket validation            | Pass   | Ticket 0006 accepted that delivery report and its matching receipt as current Test-phase evidence.                                                                                  |

### Ownership correction fast failure (2026-09-06)

Fast run `2026-09-06T23-13-08-307Z-75433` passes 1,600 unit tests and the workflow/format checks,
but typed lint and its boundary inventory reject `String(input)` in the new transport fixture
because a `Request` may stringify as an object. Read `Request.url` explicitly and pass string/URL
inputs directly to `URL`. Do not add an allowance or weaken the rule. The response-test non-null
allowance removal passes its current boundary check.

### Ownership correction verification (2026-09-06)

The reopening Plan passed before implementation. The first test draft used `installed.star` after
kernel disposal had correctly removed that property, creating teardown fixture failures alongside
real regressions. The corrected fixture retains the public facade for idempotent disposal. The
corrected original-source run records twelve expected failures and thirty-eight passes, with both
production files still byte-identical to commit `4b167b4`. Ten failures concern shared-controller
cleanup and two concern retained debounce records. Distinct-controller and explicit caller-abort
controls pass. Both original runs remain in `ownership-census/lifecycle-correction-negative*.json`.

The corrected source passes all 83 tests across request lifecycle, runtime, backend actions and
operation observation in `ownership-census/lifecycle-correction-focused.json`. The new public-core
matrix uses fetch start and settlement signals without arbitrary sleeps. Fast, changed-code coverage
and complete delivery remain required before closing the reopened criteria.

### Inspection ledger

| Finding                                                                                                 | Resolution                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cross-realm render nodes failed ambient `instanceof Element` checks.                                    | Resolve the element constructor from the kernel document and use node-type guards in the patch parser.       |
| Declarative `@action` failures are asynchronous and cannot prove synchronous cleanup aggregation.       | Inject synchronous native-listener removal failures; retain async action reporting as the existing contract. |
| Behavior debounce timers were held only in nested weak maps and could not be enumerated at destruction. | Add an application timer set, remove fired/replaced timers, and clear the remainder during teardown.         |
| A scheduled effect error reporter could throw and hide the original effect failure.                     | Retain both the original and reporting failures for the next reactive barrier.                               |
| Transactional lifecycle code exceeded the fixed ESM and UMD bundle budgets.                             | Use Vite's supported Terser path with two compression passes; do not raise either budget.                    |
| Root request cancellation ran twice during behavior-app destruction.                                    | Keep cancellation in recursive root teardown and remove the duplicate direct call.                           |
| Static analysis found the stale cancellation import and a deprecated jQuery test type.                  | Remove the import and obtain the original jQuery method through a typed reflective lookup.                   |
| Firefox called the depth comparator with the ancestor as its left argument.                             | Implement both containment directions and test the comparator directly plus Firefox and WebKit end to end.   |

## Document

COMPONENT_ARCHITECTURE now states how external native floating toggles reflect state and trigger
ARIA, how outside dismissal still works, and how stable Popover/Hover Card enhancement restores an
open overlay and focus. TESTING and PROGRAM_AUDIT record the shared and three-engine evidence. Owner
0006 and umbrella 0033 remain open for the other coverage, fixed package and full-delivery
requirements.

COMPONENT_ARCHITECTURE now states the explicit element-target named-action contract, preserved
implicit/`#id` forms and wrong-component rejection. TESTING and PROGRAM_AUDIT record the direct,
coverage and selected real-browser proof. Owner 0006 and umbrella 0033 stay open for the remaining
coverage, fixed package and full-delivery requirements.

TESTING and PROGRAM_AUDIT record this measured three-file coverage reduction and the still-red
delivery gate. The owner and umbrella tickets leave their acceptance criteria open pending the other
changed-source files, fixed package budgets and complete delivery proof.

ARCHITECTURE and RUNTIME_OWNERSHIP now distinguish plain declarative application islands, page-wide
boot and named UI component markers. BACKEND, INTEROPERABILITY and TESTING describe the nested
actual-host cases; PROGRAM_AUDIT and tickets 0016/0033/0036/0037 retain the partial audit status.
This evidence does not establish explicit separate app startup on named components or full lifecycle
closure.

TESTING and PROGRAM_AUDIT now state that the same command covers 39 core-only and 208 UI Documents,
including behavior and held/weak-reference controls. Umbrella 0033 records the extension. The
Chromium source-fixture scope does not establish other browser heaps, cross-plugin combinations or
long-run memory stability; owner acceptance remains open. The expanded source tree passes fast and
all eight browser projects, but `npm run check` fails coverage, three package limits and the
package-budget detector as recorded in Test.

TESTING now gives the repeatable Chromium command and explains the strong and weak-reference GC
controls. PROGRAM_AUDIT and umbrella 0033 record the 50-family/208-document scope and the remaining
generic, cross-browser and long-run heap work. Full lifecycle and program acceptance remain open.

COMPONENT_ARCHITECTURE describes exact local menu value priority and target resolution for action
and facade callers. TESTING records the negative and native controls; PROGRAM_AUDIT and umbrella
0033 retain the checkpoint limits. The full lifecycle/program criteria remain open. The current
Menubar evidence is the verified 926-file source/browser/build/API checkpoint above. The documented
tree also passes fast and the standalone full browser matrix, while `npm run check` fails the
coverage, package and detector requirements recorded in Test. No final acceptance follows.

Data Table cost evidence in TESTING and PROGRAM_AUDIT now distinguishes deterministic row/selector
counts from a wall-clock benchmark. The transaction observer's cleanup and reentry limits are
recorded alongside the still-open package, host, heap and delivery requirements. AC-39 remains open
until the complete browser/fast evidence binds a documented tree.

The staged plugin listener contract and its 924-file bounded checkpoint are recorded in README,
RUNTIME_OWNERSHIP, TESTING, PROGRAM_AUDIT and umbrella ticket 0033. The exact-tree verifier accepts
AC-38 while the owner stays coding: package limits, installed consumers, actual hosts, performance,
heap, semantic claims, manual accessibility and delivery remain open under AC-34 through AC-37.

Viewer documentation now states that current parts, source and rendering configuration determine
JSON projection refresh, while native branch state survives unchanged rendering and adoption. Log
Viewer documentation describes current parts, independent pause/data receipt, captured listener and
scroll ownership, callback supersession and generated IDs. README cleanup notes follow the existing
examples to preserve the frozen CSP inventory locations. Full audit requirements remain open,
including actual npm run check and delivery; AC-34 through AC-37 stay unchecked.

Clipboard/Code Block updates describe owning-window transport, live parts and descriptions, accepted
task ordering and adoption, preserved pending output, ordinary retirement, remaining reset deadlines
and provisional cleanup. The testing guide links public and three-engine coverage. The owner remains
coding with AC-34 through AC-37 unchecked; focused evidence does not close the remaining families,
actual hosts, fixed ceilings, semantic review, manual accessibility or actual `npm run check` and
delivery requirements.

### Documentation changed

- `README.md` documents transactional HTML/Datastar patches, `data-jqs-preserve`, and the
  distinction between `whenEnhanced()` and `nextUpdate()`.
- `docs/ARCHITECTURE.md` records application commit/rollback, render transactions, cleanup
  aggregation, and enhancement-barrier ownership.
- `docs/RUNTIME_OWNERSHIP.md` assigns every application, observer, request, effect, listener,
  directive, timer, mount, and render barrier to its cleanup owner.
- `docs/PROJECT.md` and `docs/README.md` add the lifecycle guarantees to the project capability and
  brain maps.
- `example/docs/api/index.html` and `example/docs/datastar/index.html` publish the barrier and
  preservation contracts on the framework website.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                           | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `test/behavior-lifecycle.test.ts` and `test/directive-application.test.ts` prove setup-time destruction stops effects and later listeners, mounts and observers, and releases returned cleanup. Runtime, declarative and kernel suites retain constructor rollback and data-record checks. Current full delivery passes.                           | Pass   |
| AC-02 | Behavior and detached-declarative regressions prove cleanup before observer delivery, continued cleanup after a callback throws and repeated destruction without duplicate callbacks. Directive/runtime suites verify removal before invocation and reverse cleanup. Current full delivery passes.                                                 | Pass   |
| AC-03 | `test/reactivity.test.ts`, `test/runtime.test.ts`, and `test/declarative.test.ts` prove later owned and unowned effects still run after one scheduled effect fails.                                                                                                                                                                                | Pass   |
| AC-04 | `test/kernel.test.ts` verifies both comparator directions; the Firefox and WebKit render proof observes `inner:true` before `outer:true`.                                                                                                                                                                                                          | Pass   |
| AC-05 | `test/patch.test.ts` proves direct and morph preservation retain the same root and application without a second mount.                                                                                                                                                                                                                             | Pass   |
| AC-06 | `test/fetch.test.ts` and `test/datastar-sdk.test.ts` await the same enhancement barrier after HTML responses, raw SSE, and official SDK element events.                                                                                                                                                                                            | Pass   |
| AC-07 | Kernel, patch, focused Chromium, Firefox, and WebKit tests prove the barrier waits for observer delivery, directives, UI ARIA setup, and reactive output.                                                                                                                                                                                          | Pass   |
| AC-08 | `test/request-lifecycle.test.ts` proves shared-controller ownership through sibling settlement and application/kernel teardown in both modes. `test/runtime.test.ts` proves fired/replaced debounce records are released before callbacks. Kernel and behavior suites verify terminal resource and observer cleanup. Current full delivery passes. | Pass   |

### Prior correction completion audit

The reopened criteria match the current source, public documentation and regression evidence.
Initial binding, mount and directive callbacks release provisional work after owner destruction.
Detached nodes remain owned until cleanup, shared request controllers retain each active request,
and fired or replaced debounce records leave their ledgers before action execution. Failure paths
continue cleanup and preserve errors. All eight criteria have direct evidence in the current
1,642-unit/487-browser delivery run, including unchanged package limits and all 16 detector
controls. Actual Test validation passed before this Document phase.

Historical status: Complete

### Original completion audit

The changed-file ledger matches the implemented lifecycle scope. Focused tests, cross-engine browser
proofs, coverage, mutation, package, self-hosting, static, property, and release gates pass. Public
and project-brain documentation describe the shipped ownership and barrier contracts.

Historical status: Complete

### Built-in initial-registration correction (2026-09-06)

The extended Plan passed before runtime edits. Against the preceding source, the new matrix has
three expected failures and twenty-two passes: `data-effect` and `data-show` execute twice after
initial destruction, and model state updates still write a destroyed input. The same public fixture
also checks native input after teardown. The `data-text` and active controls pass. Evidence is
`ownership-census/builtin-registration-negative.json`; no fixture setup failure is counted.

Both built-in effect creation paths now check terminal state immediately after synchronous initial
execution and stop the runner before ownership or listener registration when it was destroyed.
Focused/fast/coverage and full delivery remain required. The package-size correction remains open.

### Completion audit

Reopened UI correction and exact current acceptance remain pending.

## Shared first-scope continuation evidence (September 21)

Status remains coding. Plans were validated before each source extension. The changed-file ledger
for this continuation contains src/kernel.ts and src/ui/lifecycle.ts (provisional ownership and
connection checks); src/ui/pagination.ts and src/ui/stepper.ts (newer setup requests);
src/ui/toast.ts (private cleanup contract); src/ui/carousel.ts, combobox.ts, menubar.ts,
multi-select.ts, select.ts, tabs.ts, transfer-list.ts and tree.ts (retired setup guards);
src/ui/popover.ts, menu.ts, tooltip.ts and hover-card.ts (initialization-aware cleanup). Test
changes are the new scoped observer and first-scope replacement suites, plus the existing navigation
and disclosure/step document suites. Both document browser files add six cases per engine. README,
RUNTIME_OWNERSHIP, TESTING, PROGRAM_AUDIT and tickets 0006/0033 document behavior, scope and
evidence. No public API, allowance, ceiling or frozen inventory change is included.

All command logs use ui-first-scope-* under .git/jqstar/program-audit/quality-refresh-2026-09-19/.
Canonical Node 24/npm 11 is used. Plan validations pass. The promoted 20-case negative has fourteen
failures/six controls; the constructor fixture is corrected and rerun against exact hash-verified
original kernel/lifecycle source using an isolated loader, with the same result. First focused run
67514 has 161 passes/one constructor-mock fixture failure; corrected run 75470 passes 162. New
navigation/step controls expose two failures/155 passes (38924), followed by 329 passes (30019).
Provisional replacement exposes one failure/24 controls, then the cleanup-handle correction passes
425 focused tests (42194).

The 49-family diagnostic first has 27 failures/22 controls, including fixture/expected-rejection
issues. Corrected diagnostic and fresh public negative 55313 both have ten stale-write failures/ 39
controls. The connected-root negative has one failure/26 controls. The next focused run 51939 has
three remaining failures/473 passes; formatting overlapped that diagnostic, so it is not a frozen
checkpoint. Whole-root floating negatives reproduce five failures, and the expanded public negative
79582 has eight failures/46 controls. The corrected focused run 66593 passes 482 tests in 13 files.
Four additional filename filters in that command matched no suites; the actual floating selection
was run separately as 3780 and passes 431 tests in ten files. Types 91832 and focused lint 63521
pass.

The first full quality:fast run 7022 exits 1, report
.git/jqstar/runs/2026-09-21T19-52-00-238Z-61097/report.json. It records 4,834 passing tests and the
three known floating cleanup failures, with no skipped tests. ESLint and the unchanged lint boundary
gate identify two violations (connection narrowing and unknown error stringification). Both are
fixed without inventory edits. Eighteen new Playwright cases pass in session 40954, six per engine
and no skips/flakes. Native observer methods remain native underneath controlled synchronous
instrumentation. The full 1,155-case selection, final fast/static report, source hashes and isolated
build/maps must still bind before shared-checkpoint acceptance. All original full-audit requirements
remain open.

The next complete fast run (43898 exit 1, report 2026-09-21T20-01-04-234Z-77112) passes all 4,843
units and the format gate. Static checks find a native receiver alias in the new browser fixture and
two spelling occurrences. The fixture now tracks observer identity in a WeakSet, and the prose is
corrected without allowances. Browser run 47927 is deliberately interrupted with SIGINT after 314
passes, one interrupted case and 840 not run; it is not accepted. Fresh browser/fast runs use new
paths and a second frozen input snapshot. The isolated all-entry build 45411 exits 0, with 120
source hashes, 74 output hashes and 108 unique mapped sources (293 occurrences) verified. Fixed
overages in bytes are core gzip 443, CSP gzip 129, CSP Brotli 576, stores gzip 209, root raw 89,564,
UI ESM 90,421, UI CommonJS 88,725 and UMD 90,866. The new CSP gzip overrun is included; no ceiling
changes. Declaration/API/package/installed-consumer acceptance remains pending.

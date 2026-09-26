---
id: 0023
title: Decide whether jQuery Star needs native navigation
status: done
created: 2026-08-30
updated: 2026-09-05
---

# 0023: Decide whether jQuery Star needs native navigation

## Plan

### Problem

Turbo and htmx already own document visits, history, forms, frames, caching, progress, and head
behavior. A native engine is justified only by specific gaps that the lifecycle bridges cannot solve
with a small utility. Calling jQStar a full framework does not justify duplicating two mature
server-HTML navigation systems or taking over browser behavior without user-visible benefit.

### Current evidence

- Current backend actions patch signals and HTML/Datastar regions but do not intercept document
  links, submit forms, write history, reconcile `<head>`, restore scroll/focus, or define routes.
- Tickets 0016, 0036, and 0037 must provide exact supported-version event traces and public render-
  adapter bridges for actual Turbo and htmx packages before this decision starts.
- Native browser navigation and JavaScript-disabled links/forms are already the progressive
  baseline. A faster enhanced visit must preserve their URL, method, validation, submitter,
  redirect, focus, scroll, history, cache, security, and failure semantics.
- Native navigation would require at least eligibility/fallback, cancellable request ownership,
  document/head/script policy, application lifecycle, history/focus/scroll/busy state, form
  no-replay, regions, caching, accessibility, package/support cost, and cross-browser proof.
- The jQStar website is server-rendered multi-page HTML without a client router. The decision must
  use representative product pages/forms/components rather than an SPA-shaped synthetic demo.
- No fixed decision fixture/rubric, user-demand evidence rule, narrow-utility comparison, raw
  measurement schema, or per-child activation/disposition exists.

### Scope

- Freeze one same-origin, multi-route, progressively enhanced evaluation application before
  comparing candidates. It contains public-site documents, nested jQStar roots/UI, permanent state,
  query/anchor links, redirects/errors/non-HTML/downloads, GET and versioned non-GET forms with
  files/ validation/conflict, independently addressable regions, head/asset changes, long pages,
  focus targets, and deterministic server counters/delays.
- Establish native browser/JavaScript-disabled baselines in Chromium, Firefox, and WebKit, then run
  the same unmodified routes/interaction driver with the completed Turbo and htmx bridges at their
  exact supported version boundaries.
- Measure correctness for click/form eligibility, server requests, redirects/content, application
  cleanup/enhancement, permanent roots, history/back-forward/reload, title/head/assets/scripts,
  scroll/anchors/focus, busy/progress, cancellations/races/errors, regions, caching, accessibility,
  and no-JavaScript fallback.
- Record bundle/install/dependency cost, host markup/config/server changes, public concepts, test/
  documentation/support surface, upgrade/version risk, security/head/script responsibility, and
  annual maintenance estimate separately for Turbo, htmx, and any proposed native slice.
- Collect reproducible demand evidence from existing jQStar use cases, migration tickets, issue/
  discussion data available at execution, and failed ordinary composition attempts. Absence of
  demand is evidence against native ownership; hypothetical feature parity earns no score.
- For every observed gap, attempt in order: documented host configuration, current jQStar bridge, a
  host-specific correction, then a small host-neutral utility prototype. Record why each fails and
  the user-visible consequence before considering native navigation.
- Define hard gates and a weighted rubric before results. A native path requires concrete gaps in
  both supported bridges (or a documented product segment unable to use either), measurable user
  benefit, preserved browser/server authority, and lower long-term cost than bridge/utility options.
- Decide one top-level outcome: browser/Turbo/htmx only; one or more small separately ticketed
  utilities; or an opt-in native document engine. Then decide each child slice independently:
  documents (0024–0026), forms (0027), regions (0028), and prefetch (0029).
- A rejection marks every unapproved child `declined`, documents supported alternatives, and proves
  no native package/export/prototype residue. A utility decision creates a separate implementation
  ticket and does not activate 0024–0029 by implication.
- A native approval freezes exact eligibility/fallback, request/redirect/content policy,
  application/preservation, document/head/script, history/focus/scroll/busy, form no-replay, region,
  prefetch/cache, observation/security/accessibility, package graph, and per-ticket metrics before
  any implementation.

### Out of scope

- Shipping native navigation behavior.
- Choosing native navigation because a “full library” should have a router.
- Defining client routes, route data/loaders, SPA state, view templates, server endpoints, auth/CSRF
  policy, service workers/offline pages, or View Transitions.
- Rewriting Turbo/htmx internals, changing their supported ranges to improve the comparison, or
  combining best-case flows from different candidates into one score.
- Publishing research prototypes or treating one project's aesthetic preference as user demand.

### Dependencies

- Tickets 0017, 0036, and 0037.

### Acceptance criteria

- [x] [AC-01] A fixed server-rendered evaluation app and schema enumerate route/response/head/asset/
      form/region/history/focus/scroll/error/race/cache flows, deterministic counters/delays,
      expected DOM and server effects, accessibility outcomes, and exact semantic trace IDs before
      candidate measurements begin.
- [x] [AC-02] Ordinary browser navigation with JavaScript disabled passes every applicable link,
      query/anchor, redirect/error/download, GET/write/multipart/validation/submitter/conflict,
      history/reload, focus/scroll, and region-as-document fallback flow in Chromium, Firefox, and
      WebKit. This baseline cannot be weakened for enhanced candidates.
- [x] [AC-03] Completed installed Turbo and htmx bridges run the same routes, markup, server
      responses, interaction driver, assertions, browser matrix, and supported-version boundaries.
      Candidate-specific configuration is recorded as cost and cannot change user-visible success
      criteria.
- [x] [AC-04] Semantic traces and public disposal evidence cover request count/method/body
      boundaries, cancellation/supersession, outgoing/incoming roots, preservation,
      operation/barrier order, URL/title/head/script/assets, history, scroll/anchor/focus,
      busy/progress, forms, regions, errors, reload, repeated visits, and zero duplicate/leaked
      jQStar resources.
- [x] [AC-05] Every claimed gap has a stable ID, reproducible browser/version trace, user-visible or
      operational consequence, frequency/demand source, severity, affected candidates, and recorded
      attempts using host configuration, existing bridge, host-specific correction, and a bounded
      utility. A preference or missing convenience API is not automatically a product gap.
- [x] [AC-06] Cost evidence records exact raw/gzip/install bytes and graphs, dependencies/licenses/
      advisories, required markup/config/server protocol, public APIs/concepts, source/test/docs/
      browser matrix, upgrade/version coupling, security/head/script ownership, and annual
      maintenance/support estimate with uncertainty for each candidate and proposed native slice.
- [x] [AC-07] A rubric frozen before results weights browser-semantic/progressive correctness 25,
      demonstrated user gap/benefit 20, server/HTML authority and backend portability 15,
      lifecycle/failure safety 10, accessibility 10, shipped/integration cost 10, and maintenance/
      security/upgrade risk 10. Correctness, no-write-replay, no-JavaScript, ownership cleanup,
      server authority, and accessible focus/error behavior are disqualifying hard gates.
- [x] [AC-08] Sensitivity analysis and independent review show whether reasonable weights, missing
      demand, package upgrades, or excluding optional prefetch/regions/forms changes the result. Raw
      measurements and failed/extra events remain available rather than being reduced to one score.
- [x] [AC-09] The decision selects browser+bridges, separately ticketed utilities, or native
      documents, explains why it fits jQStar's server-rendered non-SPA promise, states rejected
      alternatives/unknowns/revisit triggers, and does not call bridge feature differences defects
      unless the fixed workflow proves a consequence.
- [x] [AC-10] A no-native or utility outcome marks each unapproved 0024–0029 ticket `declined`,
      links exact browser/bridge/utility guidance, and proves no `jquery-star/navigation`
      export/type/ sentinel/dependency/prototype/website claim ships. Utility work has a new
      Plan-validated ticket before implementation.
- [ ] [AC-11] A native-document outcome updates/Plan-validates 0024–0026 with exact eligibility,
      opt-in/fallback, request/final-policy, document/head/script/permanent-root,
      history/focus/scroll/ busy/error, observation/security, package, and frozen-reference metrics.
      It defines no routes and does not activate forms/regions/cache implicitly.
- [x] [AC-12] Forms, regions, and prefetch each receive a separate approved/declined disposition and
      frozen contract. Forms require the no-dispatched-write-replay boundary; regions require exact
      response matching/fallback; prefetch requires explicit intent plus HTTP/private-data bounds.
- [x] [AC-13] Architecture decision, raw evidence/schema, fixture/prototype exclusions,
      roadmap/child dispositions, public/project-brain docs, focused/three-browser/package checks,
      `npm run check`, and `git diff --check` pass without mutation testing or unapproved runtime
      code.

### Design

The evaluation server emits ordinary complete HTML documents and forms first. The same route may
also expose a marked region when a candidate asks for it, but a missing enhancement header still
returns useful full-page content. Fixture records compare semantic outcomes, not candidate event
names or timing. Host-specific bridge traces from ticket 0016 correlate to common route/DOM/focus/
history/server facts.

Candidate order is deliberate: native browser, Turbo bridge, htmx bridge, small correction/utility,
then native engine concept. A gap remains only after lower-ownership options fail. Utility
prototypes live in test/research paths, import only stable public jQStar/host APIs, and are rejected
by production census/package exports.

Measurements use exact supported bridge package tarballs and the same jQStar tarball. Controlled
server delays make request/race counts deterministic; real browser navigation establishes URL,
history, focus, scroll, form, download, script, and cache facts. Reports use partial-order semantic
traces and normalized route IDs, not undocumented host events or wall-clock-only assertions.

Native approval is per slice. Documents require 0024–0026 as one minimum coherent chain. Forms,
regions, and prefetch can be declined even if documents win. A native concept must not score future
features that are not approved, and an unapproved slice cannot hide inside an earlier ticket.

### Execution contract frozen before measurements

Cleanup ticket 0051 is complete at `0450261`, with exact-tree delivery receipt
`2026-09-05T21-59-57-934Z-50701`. The detailed pre-measurement contract is now
`quality/navigation-decision.json`: six candidates, all three browser engines, 28 named workflows,
fixed assertions/applicability, deterministic delays, semantic event IDs, hard gates, weights,
demand rules, gap ladder, sensitivity and per-slice ticket mapping. The architecture decision file
will keep that contract distinct from later results.

Use one ordinary documentation/editor application derived from the public site and completed
0039/0040 migration flows. All candidates receive the same application HTML and responses; only a
fixture context cookie chooses the host startup asset. Native `details`/`summary` uses the shipped
collapsible component. Regions remain complete documents. Explicit native boundaries cover changed
head/script policy and non-HTML/download destinations, with their cost recorded. Candidate defaults
and any documented configuration/corrections keep separate raw runs.

Install one locally packed jQStar artifact in an isolated private consumer alongside the exact
published host boundaries. Record original package/lock integrity and resolved graphs. Freeze the
actual shared fixture/server/driver/startup hashes before the first baseline. The full measurement
command retains failed and extra events; existing unit/static/browser/package gates validate the
result and a bounded regression subset using the same driver. No new canonical gate is required.

The read-only GitHub issue query returned zero issues; discussions are disabled with zero records.
Existing product and migration workflows are evidence of needs, not proof that native ownership is
needed. Do not select an outcome until the fixed comparison, correction ladder and sensitivity are
complete. Independent calculation and a separate same-session review will be identified honestly.

Additional planned files: `scripts/prepare-navigation-decision.mjs`, a research scoring/validation
helper, `test/navigation-decision-contract.test.mjs`, `test/navigation-decision-server.test.mjs`,
and `scripts/quality/validate-json.mjs` for canonical schema enforcement. The server may use `.mjs`
with a `.d.mts` declaration so the measurement script and browser driver share one implementation.
Package exclusions and production import checks will explicitly reject research navigation paths. No
candidate behavior or prototype has been implemented or measured yet.

Evidence storage refinement: preserve every raw measurement in a committed, lossless gzip archive
under `quality/evidence/navigation/`, with compressed/decoded hashes, byte bounds and exact summary
counts in the decision manifest. `scripts/quality/navigation-evidence.mjs` validates the full closed
raw schema on every read. Original immutable run files remain under `.git/jqstar`. This keeps large
trace histories available without placing tens of megabytes of repeated inline JSON in the review or
TypeScript's input graph. Archive conversion requires exact parsed-content round trips.

Cost evidence refinement: retain the complete installed-package file inventory and uninstrumented
bundle graphs in `quality/evidence/navigation-costs.json`, validated by the same closed research
schema. The final manifest separates measured bytes from unbuilt native estimates, records estimated
annual support hours as ranges, and identifies the scoring judgments. A reproducible scoring command
and an independently calculated weight sweep verify arithmetic; neither substitutes for another
person's review. This adds no runtime capability or candidate-specific success criteria.

Quality integration refinement: add an explicit `quality/scopes.json` archive scope backed by full
schema/digest validation and exact directory/reference matching. Update the completed Mobile
migration contract to assert the recorded no-native decision instead of requiring its prerequisite
to remain planned forever. Regenerate the CSP line-location inventory and agent corpus after public
prose changes. These preserve existing product and quality boundaries.

### Decisions

- Native browser behavior is the progressive baseline; Turbo and htmx are the first enhanced
  solutions evaluated.
- User-visible gaps and maintenance fit decide ownership. “Full framework,” package popularity, and
  feature counts do not.
- Try configuration, bridge correction, and a small utility before a native engine.
- A native package, if approved, is opt-in and route-free. The root entry never installs it.
- Documents (0024–0026), forms (0027), regions (0028), and prefetch (0029) receive independent
  dispositions and cannot be smuggled across ticket boundaries.
- View Transitions remain outside the baseline and need later cross-browser/fallback evidence.
- Research code never becomes a public import by surviving the decision branch.

### Security and accessibility

- Fixture credentials/CSRF values are inert and reports redact URLs/query values, headers, cookies,
  form/file contents, response bodies/HTML, history state, signal values, and DOM references.
- Every candidate preserves same-origin, redirect, credentials, CSP, Trusted Types, script,
  download, method/body, server validation/authorization, and no-write-replay boundaries. A client
  URL match is never authority to fetch/commit.
- Head/script behavior and form/files are tested in actual browsers; jsdom cannot establish their
  security or platform semantics.
- Keyboard/focus order, native validation, error summaries, live announcements, scroll/anchors,
  reduced motion, forced colors, zoom/reflow, progress, and JavaScript-disabled operation are rubric
  hard gates rather than polish points.

### Risks

- A fixture designed around one library can bias the result. Use ordinary links/forms and the same
  server responses for every candidate.
- View Transitions can distract from navigation correctness. Keep them outside the decision
  baseline.
- A native prototype can look simpler by omitting history/head/forms/failure details. Score only
  complete approved slices and include their full public/test/support cost.
- The bridge version matrix can change during a long decision. Pin exact tarballs/integrity and
  rerun when the supported manifest changes.
- Synthetic user demand can predetermine the result. Record source/frequency/date and treat absent
  evidence as uncertainty against new ownership.
- Timings can overvalue warm client caching while ignoring browser HTTP cache or server response
  composition. Record request count/content/cache inputs and correctness separately.
- Prototypes can leak into production. Enforce research-only paths across export maps, production
  census, bundles, package contents, public baseline, and website claims.

### Verification plan

- Validate this Plan, fixed fixture, demand evidence rules, rubric, and hard gates before candidate
  measurement or prototypes.
- Establish native/JavaScript-disabled baselines, then completed Turbo/htmx bridge baselines at
  supported version boundaries using the same parameterized route/interaction driver and
  Chromium/Firefox/WebKit projects.
- For each gap, reproduce it, test host configuration and bridge corrections, then implement only
  the smallest research utility needed to test the hypothesis. Retain negative results/traces.
- Measure exact packages/bundles/graphs/dependencies, request/server facts, semantic traces,
  application disposal, source/test/docs/API footprint, accessibility, support/version coupling, and
  maintenance/security cost with raw schema-validated data.
- Independently inspect no-write-replay, response/head/script safety, history/race/failure
  consistency, permanent roots, cross-document ownership, focus/scroll/forms/regions/cache, rubric
  bias, and sensitivity.
- Record the architecture decision; update/Plan-validate or decline every child plus any new utility
  ticket; prove unselected runtime/dependencies/exports are absent.
- Run focused/schema/docs/static/package/three-browser checks, `npm run check`, ticket Test/Document
  validation, and `git diff --check` without mutation testing.

### Planned files

- `docs/decisions/NATIVE_NAVIGATION.md`: Fixed workflow, candidate/demand evidence, gaps/utility
  attempts, raw metrics, rubric/sensitivity, per-slice decision, tradeoffs, and revisit triggers.
- `quality/navigation-decision.json`, `schema/navigation-decision.schema.json`: Fixture/candidate/
  version identity, hard gates/weights, semantic trace and gap records, costs, outcomes, and child
  dispositions.
- `test/fixtures/navigation-decision/`: Ordinary multi-route HTML, head/assets/scripts, nested
  roots, preservation, links/anchors/downloads, forms/files/conflicts, regions, failures, long-page
  focus/ scroll, and candidate adapters excluded from publication.
- `e2e/fixtures/navigation-decision-server.ts`, recorder/driver utilities,
  `e2e/navigation-decision.spec.ts`: Deterministic same-origin server and parameterized native/
  Turbo/htmx/utility three-browser semantic proof.
- `scripts/measure-navigation-decision.mjs`: Exact package/bundle/graph/source/test/docs/dependency
  measurements and immutable raw result generation without automatic selection.
- `package.json`, lockfile, browser config: Exact supported host-package aliases and focused
  research commands only; no production navigation dependency/export.
- Tickets 0024–0029, roadmap, and any new utility ticket: Frozen activation contracts or terminal
  declined dispositions with no hidden implementation.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,INTEROPERABILITY,TESTING}.md`, website navigation guide:
  Selected supported paths, product boundary, progressive enhancement, and non-shipped alternatives.
- `docs/tickets/0023-decide-native-navigation.md`: Phase, ledger, commands, traces, findings,
  rubric, decision, criterion evidence, and completion audit.

## Code

### Changed-file ledger

| File                                                                                                                                                                | Purpose                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality/navigation-decision.json`                                                                                                                                  | Freeze six candidates, 28 workflows, assertions, scoring, demand and correction rules before measurements.                                                             |
| `schema/navigation-decision.schema.json`                                                                                                                            | Validate the frozen contract, every raw trace/archive, measured cost inventory and terminal decision using closed schemas.                                             |
| `docs/decisions/NATIVE_NAVIGATION.md`                                                                                                                               | Record the fixed comparison, exact evidence, gap ladder, costs, scores/sensitivity, declined slices, guidance and limitations.                                         |
| `test/fixtures/navigation-decision/{html,server}.mjs`, `style.css`, `bootstrap.js`                                                                                  | Shared native HTML app, deterministic request/write ledger, public lifecycle probe and host startup.                                                                   |
| `scripts/prepare-navigation-decision.mjs`                                                                                                                           | Build one exact local tarball, install pinned host aliases, and bundle installed public entries with graph/digest records.                                             |
| `test/navigation-decision-server.test.mjs`                                                                                                                          | Real HTTP invariance, multipart boundary, version/no-replay and redacted session checks.                                                                               |
| `test/fixtures/navigation-decision/driver.mjs`                                                                                                                      | One isolated-context browser driver maps all 28 frozen workflows to redacted server, DOM, lifecycle and disposal facts.                                                |
| `scripts/measure-navigation-decision.mjs`                                                                                                                           | Freeze inputs before costs/browser runs, preserve failed/default results, and refuse enhanced runs after a failed native baseline.                                     |
| `test/fixtures/navigation-decision/host-corrections.js`                                                                                                             | Research-only public host configuration and event corrections, with every listener owned by the public document host.                                                  |
| `test/fixtures/navigation-decision/{driver,server}.d.mts`, `e2e/navigation-decision.spec.ts`, `e2e/fixtures/navigation-decision-server.mjs`, `playwright.config.ts` | Typed shared-driver browser regression matrix against the installed artifact.                                                                                          |
| `scripts/quality/navigation-decision-score.mjs`, `test/navigation-decision-contract.test.mjs`                                                                       | Frozen weighted calculation, complete sensitivity enumeration, matrix completeness, schema and package-boundary checks.                                                |
| `scripts/measure-navigation-costs.mjs`                                                                                                                              | Exact host tarballs, installed file/dependency/license inventory, advisory snapshot and uninstrumented public-entry bundles.                                           |
| `scripts/quality/navigation-evidence.mjs`, `quality/evidence/navigation/*.json.gz`                                                                                  | Lossless bounded raw evidence, verified compressed/decoded hashes and summaries, and canonical validation without inline trace duplication.                            |
| `scripts/measure-navigation-supplement.mjs`                                                                                                                         | Explicitly partial private-entry and Chromium cache-setting probes with exact package/source identities and archived raw results.                                      |
| `test/navigation-host-corrections.test.mjs`                                                                                                                         | Regression checks for GET-versus-write response handling, exact transport-error identity and listener release.                                                         |
| `package.json`, `.dependency-cruiser.cjs`, `scripts/quality-package.mjs`                                                                                            | Research commands and explicit production import/package/graph exclusions.                                                                                             |
| `scripts/quality/validate-json.mjs`                                                                                                                                 | Canonical validation of the closed navigation evidence schema.                                                                                                         |
| `scripts/score-navigation-decision.mjs`, `quality/evidence/navigation-costs.json`                                                                                   | Reproduce terminal matrix/scoring/slice checks and retain the exact installed file/graph/cost inventory.                                                               |
| `README.md`, `docs/{README,PROJECT,ARCHITECTURE,INTEROPERABILITY,TESTING,LIBRARY_EXPANSION_PLAN}.md`                                                                | Document browser/host ownership, recovery, server write protection, privacy, decision evidence and conditional history.                                                |
| `example/docs/interoperability/index.html`, `example/agent-content.generated.json`, `example/public/{jqstar-agent-index.json,llms-full.txt}`                        | Publish supported navigation guidance and regenerate the shared browser/headless agent corpus.                                                                         |
| Tickets 0024–0029 and `docs/tickets/ROADMAP.md`                                                                                                                     | Record separate rejected activation and supported document/form/region/prefetch contracts.                                                                             |
| `quality/scopes.json`, `test/jquery-mobile-migration-contract.test.ts`, generated CSP inventory                                                                     | Assign every raw archive to enforced validation, consume the terminal decision in prior migration proof, and refresh source-line evidence after documentation changes. |
| This ticket                                                                                                                                                         | Record the validated execution contract and phase evidence.                                                                                                            |

### Design changes

The first partial Chromium baseline exposed instrumentation issues before any host comparison.
Playwright's `addStyleTag` never resolved with JavaScript disabled; a two-second isolated probe
confirmed that behavior. Font reflow now uses an explicit test-side DOM style change, and every flow
has a 30-second watchdog. Race/progress clicks now use previously measured pointer coordinates so
locator navigation waiting cannot serialize the intended overlapping inputs. Keyboard continuity
requires actual focus on the next link, rather than merely the presence of a body.

The initial pre-header socket reset caused Chromium itself to retransmit the multipart POST. The
server's revision guard rejected that second dispatch with 409, so exactly one write committed. The
comparison now acknowledges receipt with response headers and then loses the response body, which
isolates the enhanced host's recovery/replay behavior from stale-connection transport retries. The
initial result remains evidence that server revision/idempotency protection is required even without
a JavaScript navigation owner. This is a recorded fixture amendment with a complete rerun, not a
passing no-replay result for the original pre-header loss.

The second full no-JavaScript matrix proved cancellation and acknowledged-response no-replay, but
some focus checks raced native autofocus. They now wait for the same required focused error field. A
separate pointer/keyboard probe showed Chromium defers test-side JavaScript evaluation during a
pending native navigation and rejects it at commit; Firefox allowed it; WebKit's default link-tab
policy differed. The shared progress flow still sends Tab while the response is pending, then proves
keyboard continuity by focusing and typing into the destination's native search control after the
commit. It no longer assumes a cross-browser pre-commit link focus or calls a destroyed realm a
framework failure. Native browser-chrome progress/error presentation is outside the headless DOM
surface; request/failure facts establish browser ownership, not a visual or screen-reader audit of
browser chrome. Enhanced document progress and error UI remain directly asserted.

The first complete 840-flow matrix retained 122 failures across raw/default and configured hosts;
both ordinary-browser baselines passed all applicable flows in all three engines. Separate
public-event probes resolved the tested host fallback/progress gaps. The integrated correction
module now owns listeners through the public document host: native local anchors/204 boundaries,
explicit prefetch cancellation, missing-frame/full-document recovery, narrowly handled reported
Turbo transport failures, rejected non-redirect write responses, and htmx region/indicator policy.
No production bridge or runtime changed. The final matrix will repeat every candidate with these
corrections, retaining the earlier configuration results.

An isolated promise-rejection probe established that Playwright reports `pageerror` for a prevented
`unhandledrejection` in Firefox but not Chromium/WebKit. Raw browser `scriptErrors` remain in every
flow. New public window-event counters separately record actually unhandled errors and known Turbo
transport errors handled by exact object identity; only uncaught errors disqualify a flow. Unrelated
errors are never suppressed. This avoids relabeling a handled Firefox transport failure as an
uncaught application error. The driver also waits for host busy/settling attributes after the jQStar
enhancement barrier: the bridge owns DOM enhancement, while the host still owns its later
URL/history/scroll completion.

Integrated run `2026-09-05T22-55-40.907Z-18510` was stopped with partial evidence when it exposed
two correction-probe integration mistakes. The non-redirect response check now excludes GET forms.
The uncaught-error observer registers after the exact known-error handlers because native dispatch
can run microtasks between listeners. History input now waits for a recorded scroll event before
starting a visit, allowing the host's scroll observer to record the position. An independent axe
scan found the fixture's two disabled sentinel controls lacked names; both now have native
accessible labels, with the same markup in every candidate. The browser regression suite also runs
axe on the normal and server-error documents. These fixture corrections require another full
comparison.

Full run `2026-09-05T23-00-43.667Z-21370` passed both browser baselines and all configured htmx
flows; the only configured failure was Chromium Turbo history restoration. A semantic trace showed
the driver issuing Back before the previous visit's final native scroll event. That late event
overwrote the restored entry's position. A focused three-engine probe passed after one browser frame
between host settlement and the next history action. The shared readiness barrier now includes that
frame for every JavaScript candidate. The original rapid programmatic-history limitation remains in
the raw evidence and decision discussion; this is not a claim that Turbo supports every unpainted
history transition. A supplemental run with Chromium's back-forward cache enabled reproduced the
same limitation, while the other tested history/preservation/lifecycle/private-cache cases passed.

Full run `2026-09-05T23-10-23.339Z-25701` passed every configured flow and retained all default
failures. Before closing the decision, a supplemental link-entry privacy probe found that htmx 2.0.0
stored the private fixture marker after a boosted entry in all three engines; 2.0.10 and both Turbo
versions passed. The original private flow entered the page directly, so it missed this path. The
embargo now appears on the private `main` element that actually swaps, as well as `body`. NAV-26
exercises both direct and linked entry before leaving, restoring and checking storage. The expanded
case also joins the normal browser regression subset. No private application data was used: only the
fixed fixture marker. This is host markup configuration, not a runtime or cache API.

The final complete comparison `2026-09-05T23-18-54.986Z-29717` passes all 498 applicable configured
flows across 30 total rows and 840 flows, retaining 72 host-default failures. The expanded
private-entry case passes both htmx versions. The same-source Chromium cache-launch-policy
supplement passes its applicable four-scenario scope and remains explicitly partial. No confirmed
BFCache performance or manual assistive-technology claim follows.

The decision selects browser navigation plus existing bridges and separately rejects documents,
forms, regions and prefetch. Configuration/public application hooks resolve the demonstrated needs;
the disclosed rapid Turbo history limitation does not establish a gap in both hosts. No generic
utility or native runtime was added. The independent Python calculation matches nominal totals,
2,187 weight combinations, 891 strict wins for each browser baseline and 405 ties. Zero-benefit and
optional-scenario exclusion checks leave the outcome unchanged. Cost judgments and estimates are
identified as such, with complete measured package inventories retained.

## Test

| Command                                                                                                                                         | Result               | Evidence                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0023-decide-native-navigation.md`                                                | Pass                 | Six exact candidates, 28 workflows, hard gates, weights, demand and measurement rules validated before Code.                                                                                                                                                                                                                                                                         |
| Direct `createSchemaValidator` navigation Plan check (first run)                                                                                | Fail                 | Strict Ajv requires an explicit array type beside conditional `maxItems`; added the type before any fixture implementation.                                                                                                                                                                                                                                                          |
| Direct `createSchemaValidator` navigation Plan check                                                                                            | Pass                 | Frozen Plan and empty measurement state satisfy the strict schema.                                                                                                                                                                                                                                                                                                                   |
| `npx vitest run test/navigation-decision-server.test.mjs`                                                                                       | Pass                 | All four Node HTTP checks pass: identical full documents, real multipart parsing, version/no-replay boundaries and redacted isolated sessions.                                                                                                                                                                                                                                       |
| `npm run research:navigation:measure -- --record` (initial preparation)                                                                         | Fail                 | Contract content was unchanged, but its Python-generated digest escaped Unicode while the JavaScript canonical encoder retained UTF-8. Corrected the digest encoding before package preparation or browser measurement; `.git/jqstar/navigation-first-measurement.log` preserves the refusal.                                                                                        |
| `npm run research:navigation:measure -- --record` (first browser run)                                                                           | Fail                 | Partial Chromium no-JavaScript run `2026-09-05T22-39-13.801Z-8819` preserves NAV-16/19/25 failures and completed flows. NAV-28 hung in Playwright style injection; the owned browser was terminated so the runner retained its partial raw evidence. Fixture corrections and the exact write-loss boundary are explained above.                                                      |
| Full amended no-JavaScript matrices `2026-09-05T22-42-19.830Z-10711` and `2026-09-05T22-44-28.087Z-12549`                                       | Fail                 | All three engines completed. The first identified autofocus timing and pending-realm assumptions; the second passed every applicable flow except NAV-25's text insertion check, which assumed an initial caret position. The driver now clears the destination search input before real keyboard typing. All raw failures remain in the decision evidence.                           |
| Full six-candidate comparison `2026-09-05T22-45-42.873Z-14119`                                                                                  | Fail                 | All 30 browser/configuration rows and 840 flows retained, including 122 failures. Both browser baselines passed. Configured htmx had only region fallback and progress failures; Turbo configuration and transport-error differences required the documented correction probe.                                                                                                       |
| Separate public-event correction and rejection-reporting probes                                                                                 | Pass                 | `.git/jqstar/navigation-correction-probe.json` records the focused hypotheses. A controlled prevented-rejection probe returned raw pageerror counts Chromium 0, Firefox 1, WebKit 0 with one handled event in every engine. These probes explain amendments and do not substitute for integrated lifecycle or final matrix evidence.                                                 |
| `npx vitest run test/navigation-decision-contract.test.mjs`                                                                                     | Pass                 | Four contract checks validate the UTF-8 frozen digest/schema, pinned package boundaries, incomplete-evidence refusal and 2,187 sensitivity combinations excluding ineligible candidates.                                                                                                                                                                                             |
| Integrated corrected comparison `2026-09-05T22-55-40.907Z-18510`                                                                                | Fail                 | Retained partial matrix, including GET-form interception, premature error counting and Chrome scroll-observer failures. The owned measurement browser was stopped before further comparisons; the runner wrote immutable partial evidence. The first stop targeted a browser that had already exited, then the current owned child was stopped.                                      |
| Focused accessibility and correction regression probes                                                                                          | Fail, then corrected | The first axe probe required an explicit BrowserContext; its corrected invocation identified two unnamed disabled controls. Added labels and exact method/error-identity regression tests before the complete rerun.                                                                                                                                                                 |
| Full corrected matrix `2026-09-05T23-00-43.667Z-21370`                                                                                          | Fail                 | All 840 flows retained. Configured htmx passes both pinned versions in all browsers; configured Turbo has only Chromium NAV-05 failures. Native baselines pass. The documented post-paint readiness probe resolves that test boundary in Chromium/Firefox/WebKit.                                                                                                                    |
| Lossless archive conversion and canonical schema validation                                                                                     | Fail, then Pass      | Six raw measurements round-trip exactly. The first archive-validator integration exposed a top-level-await import cycle and exited 13; the archive helper now owns its strict Ajv compiler and canonical validation passes without a cycle.                                                                                                                                          |
| Full comparison `2026-09-05T23-10-23.339Z-25701`                                                                                                | Pass                 | All 30 rows and 840 flows retained; every configured flow passes. The subsequent private link-entry probe identified a missing entry path, so this run alone does not authorize decision closure.                                                                                                                                                                                    |
| `node scripts/measure-navigation-supplement.mjs private-link-entry`                                                                             | Fail                 | Archived `private-link-entry-2026-09-05T23-14-59.788Z-28627`: 18 exact browser/candidate rows, with htmx 2.0.0 failing the storage assertion in all three engines. Private-root markup and direct-plus-linked NAV-26 coverage correct the fixture contract before another complete run.                                                                                              |
| `npm run research:navigation:measure -- --record --amend ...` (final direct-plus-linked private matrix)                                         | Pass                 | Run `2026-09-05T23-18-54.986Z-29717`: all 30 rows and 840 flows retained; 498 applicable configured flows pass with zero uncaught errors/ownership failures. The 72 default failures remain available.                                                                                                                                                                               |
| `node scripts/measure-navigation-costs.mjs`                                                                                                     | Pass                 | Matching final fixture/artifact; complete package file/dependency/license inventory, exact host tarballs, uninstrumented graphs and zero known advisory snapshot in `quality/evidence/navigation-costs.json`.                                                                                                                                                                        |
| `node scripts/measure-navigation-supplement.mjs chromium-cache-sensitivity`                                                                     | Pass                 | Archived partial-scope run `chromium-cache-sensitivity-2026-09-05T23-25-19.015Z-33241` passes all applicable history/preservation/lifecycle/privacy flows with the disabling launch flag removed. No BFCache speed/restoration claim.                                                                                                                                                |
| `node scripts/score-navigation-decision.mjs` and independent Python Cartesian sweep                                                             | Pass                 | Both calculate browser totals 86, host totals 79, native ineligibility, 891/891 strict wins and 405 ties across 2,187 weight combinations; optional exclusions retain 390/462/480 passing flows.                                                                                                                                                                                     |
| `npx vitest run test/navigation-decision-contract.test.mjs test/navigation-decision-server.test.mjs test/navigation-host-corrections.test.mjs`  | Pass                 | Fourteen tests validate complete matching evidence, exact costs/gap references, archive/field refusal, score/sensitivity, native package absence, server write boundary and public host corrections.                                                                                                                                                                                 |
| `node scripts/quality/validate-json.mjs`                                                                                                        | Pass                 | 81 JSON files, 17 instances and 23 schemas validate, including every bounded raw archive and the exact cost inventory.                                                                                                                                                                                                                                                               |
| `npm run build:agent-content`                                                                                                                   | Pass                 | Public navigation ownership/recovery/privacy guidance is present in the shared browser and headless corpus.                                                                                                                                                                                                                                                                          |
| `npm run quality:fast` (first run)                                                                                                              | Fail                 | Run `2026-09-05T23-31-57-654Z-34706`: archive files lacked a quality scope; spelling found prose issues; three unit tests detected agent/CSP generated drift and Mobile's stale planned-ticket assertion. Added explicit archive validation scope, corrected prose, regenerated inventories and asserted the recorded no-native outcome. All other static checks passed.             |
| `npm run quality:fast` (corrected run)                                                                                                          | Pass                 | All six gates pass in `2026-09-05T23-34-05-268Z-46350`, including the complete unit suite and every static check. The archive census is complete, spelling is clean, generated inventories agree and prior migration proof consumes the no-native decision.                                                                                                                          |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0023-decide-native-navigation.md --report .git/jqstar/latest-report.json`        | Pass                 | Code closure accepted the exact unchanged tree and current fast report before moving to testing.                                                                                                                                                                                                                                                                                     |
| `npx playwright test e2e/navigation-decision.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit --retries=0` | Pass                 | All 33 tests pass in 1.9 minutes: six installed candidates through the shared regression driver in all three engines, plus normal/error-document axe for five JavaScript candidates. No retries, skips or flaky passes. Artifacts: `.git/jqstar/navigation-focused-browser/`.                                                                                                        |
| `npm run test:package`                                                                                                                          | Pass                 | Built ESM/UMD behavior and all 233 packed files pass, including registry, CLI and the regenerated agent corpus. Research archives and native navigation are not published.                                                                                                                                                                                                           |
| `npm run check` (`quality:delivery`, first run)                                                                                                 | Fail                 | Run `2026-09-05T23-37-12-616Z-59696` found one spelling issue in the newly added inspection ledger; other completed static checks passed. Stopped the owned runner after the failure to avoid executing the remaining long gates against known failing text. Its interrupted report grants no receipt. Corrected the prose and checked spelling before restarting the complete gate. |
| `npm run check` (`quality:delivery`)                                                                                                            | Pass                 | Run `2026-09-05T23-39-37-490Z-84736` passes all 13 gates, including the 1,048-test unit suite, coverage/property/static/security, installed package and release proof, 481 browser tests with zero skips/flaky results, and detector self-tests.                                                                                                                                     |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0023-decide-native-navigation.md --report .git/jqstar/latest-report.json`        | Pass                 | Test closure accepted the exact unchanged tree and authorized delivery receipt before Document.                                                                                                                                                                                                                                                                                      |

### Initial fixture checks

The first server suite passed HTML invariance and redaction/session cases, but its two multipart
cases returned 500 under the default jsdom environment. The fixture executes in Node, so the server
suite now explicitly uses Node's native FormData/Blob environment. This precedes all candidate
browser measurements; no comparison result was collected.

### Inspection ledger

| Area                               | Finding                                                                                                                 | Resolution and evidence                                                                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparison bias and provenance     | One fixture, exact host boundaries and one installed artifact are required; unbuilt native behavior cannot earn points. | Frozen UTF-8 contract and fixture identities, complete raw archives, cost inventory and terminal contract tests enforce the boundary. Ratings and estimated support hours are explicitly judgments.                          |
| Server writes and errors           | Pre-header loss can trigger a browser retry; suppressed Firefox error reporting can be confused with uncaught failure.  | Preserve the original duplicate POST and one-commit server guard evidence. Final acknowledged-response loss never adds a replay. Exact handled Error identity and uncaught counters are separate from raw page error events. |
| History and private data           | Rapid Turbo Back can race its final scroll event; direct-only private entry missed an older htmx path.                  | Retain the limitation and post-paint interaction boundary. The supplemental privacy failure remains archived; direct-plus-linked entry with subtree cache embargo passes all exact hosts/engines.                            |
| Public ownership and exposure      | Research configuration must not become an undocumented bridge or native API.                                            | Hooks use owned public host events; lifecycle/disposal facts reconcile. Export/import/package guards exclude navigation research. No runtime source change, native package or generic utility was added.                     |
| Accessibility and cache claims     | DOM/axe evidence cannot establish manual assistive-technology, browser chrome or BFCache performance.                   | Decision and public guidance state the scope. Native labels/errors/focus/reflow/media checks remain required; the cache-launch probe is explicitly partial and makes no speed claim.                                         |
| Independent calculation and review | A same-session audit must not be represented as a second human or agent.                                                | Separate source/evidence review and independently written Python arithmetic are identified accurately; JavaScript reproduces the same 2,187 combinations and optional-scenario checks.                                       |
| Quality integration                | New binary evidence and changed prose exposed stale scope/generated/ticket assumptions.                                 | Explicit archive scope, exact directory matching, generated agent/CSP refresh and a decision-based Mobile assertion pass the corrected fast gate.                                                                            |

## Document

### Documentation changed

The navigation decision, README, project brain, architecture, interoperability/testing guidance,
expansion plan, roadmap, child tickets and public bridge page now describe the selected browser/host
composition. The generated agent corpus carries the same public contract.

### Acceptance evidence

| Criterion | Result               | Evidence                                                                                                                                                                                                                                                                                                                                   |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass                 | The frozen 28-scenario UTF-8 contract, closed schema, shared HTML/server/driver and source amendment chain predate every candidate run. Assertions, request counters, semantic IDs and media/keyboard checks are explicit.                                                                                                                 |
| AC-02     | Pass                 | Final run `2026-09-05T23-18-54.986Z-29717`: all 26 applicable no-JavaScript scenarios pass in each engine with zero script requests. The two JavaScript-only exclusions were frozen before measurement.                                                                                                                                    |
| AC-03     | Pass                 | All six candidates use identical documents, responses and driver assertions. The four pinned host versions use the same installed jQStar artifact; exact lock integrity, modules and configuration costs are retained.                                                                                                                     |
| AC-04     | Pass                 | Every applicable configured flow passes request/write/DOM/URL/head/history/focus/progress/preservation assertions and public terminal ownership checks. Semantic order and raw failures remain in hash-verified archives.                                                                                                                  |
| AC-05     | Pass                 | Ten stable NAV-GAP records link exact run/browser/version/configuration/scenario traces, consequences, frequency/source, severity and all correction-ladder dispositions. Public configuration/hooks and the remaining history/transport limitations are documented.                                                                       |
| AC-06     | Pass                 | Closed cost inventory retains file/tarball/bundle hashes, bytes, graphs, dependencies/licenses/advisory snapshot and six candidate/four unbuilt-slice records. Markup, config, protocol, public/source/test/doc surface and uncertain annual ownership estimates are explicit.                                                             |
| AC-07     | Pass                 | Frozen weights and hard gates remain unchanged. Incomplete/currently mismatched evidence and altered scores are refused. Unbuilt native candidates have no total or future behavior credit.                                                                                                                                                |
| AC-08     | Pass                 | JavaScript and independent Python arithmetic agree across 2,187 weight combinations. Missing-demand, supported-version and separate form/region/prefetch exclusions leave the decision unchanged. All failed/partial runs, private-entry probe and cache-launch supplement remain available; same-session review is identified accurately. |
| AC-09     | Pass                 | NATIVE_NAVIGATION.md selects browser navigation plus existing bridges, records alternatives, gaps, ownership and remaining limitations, and names evidence required to reopen. No client routes or generic navigation utility was added.                                                                                                   |
| AC-10     | Pass                 | Each of 0024–0029 has a terminal declined activation/disposition and supported guidance. Export, import, dependency and actual packed-file checks reject native navigation/research publication; runtime sources are unchanged.                                                                                                            |
| AC-11     | Approved-Disposition | The frozen native approval rule rejected native documents. Tickets 0024–0026 are declined; implementation-specific Plan activation is inapplicable.                                                                                                                                                                                        |
| AC-12     | Pass                 | Forms 0027, regions 0028 and prefetch 0029 are separately declined with explicit no-write-replay, exact-region fallback and HTTP/host private-cache contracts.                                                                                                                                                                             |
| AC-13     | Pass                 | Decision/schema/raw evidence, public/brain/site/agent guidance, roadmap and child dispositions are complete. Fourteen focused tests, 33 dedicated browser/axe tests, package smoke, full delivery, ticket phase checks and diff checks pass without mutation testing or runtime changes.                                                   |

### Completion audit

The selected browser/bridge workflow passes the complete installed matrix in all three engines. The
decision keeps all failed and partial traces, costs, measured corrections and limitations. Every
criterion has direct evidence or the conditional native-approval disposition. Each rejected child
has an explicit supported contract. No runtime source, native export/type/dependency or published
research prototype was added. Public, brain and generated agent guidance agree. The full delivery
report above binds the tested source; final documentation receives its own unchanged-tree delivery
receipt before commit. Reopening native or utility work requires new evidence and Plan validation.

Status: Complete

---
id: 0023
title: Decide whether jQuery Star needs native navigation
status: planned
created: 2026-08-30
updated: 2026-09-01
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

- [ ] [AC-01] A fixed server-rendered evaluation app and schema enumerate route/response/head/asset/
      form/region/history/focus/scroll/error/race/cache flows, deterministic counters/delays,
      expected DOM and server effects, accessibility outcomes, and exact semantic trace IDs before
      candidate measurements begin.
- [ ] [AC-02] Ordinary browser navigation with JavaScript disabled passes every applicable link,
      query/anchor, redirect/error/download, GET/write/multipart/validation/submitter/conflict,
      history/reload, focus/scroll, and region-as-document fallback flow in Chromium, Firefox, and
      WebKit. This baseline cannot be weakened for enhanced candidates.
- [ ] [AC-03] Completed installed Turbo and htmx bridges run the same routes, markup, server
      responses, interaction driver, assertions, browser matrix, and supported-version boundaries.
      Candidate-specific configuration is recorded as cost and cannot change user-visible success
      criteria.
- [ ] [AC-04] Semantic traces and public disposal evidence cover request count/method/body
      boundaries, cancellation/supersession, outgoing/incoming roots, preservation,
      operation/barrier order, URL/title/head/script/assets, history, scroll/anchor/focus,
      busy/progress, forms, regions, errors, reload, repeated visits, and zero duplicate/leaked
      jQStar resources.
- [ ] [AC-05] Every claimed gap has a stable ID, reproducible browser/version trace, user-visible or
      operational consequence, frequency/demand source, severity, affected candidates, and recorded
      attempts using host configuration, existing bridge, host-specific correction, and a bounded
      utility. A preference or missing convenience API is not automatically a product gap.
- [ ] [AC-06] Cost evidence records exact raw/gzip/install bytes and graphs, dependencies/licenses/
      advisories, required markup/config/server protocol, public APIs/concepts, source/test/docs/
      browser matrix, upgrade/version coupling, security/head/script ownership, and annual
      maintenance/support estimate with uncertainty for each candidate and proposed native slice.
- [ ] [AC-07] A rubric frozen before results weights browser-semantic/progressive correctness 25,
      demonstrated user gap/benefit 20, server/HTML authority and backend portability 15,
      lifecycle/failure safety 10, accessibility 10, shipped/integration cost 10, and maintenance/
      security/upgrade risk 10. Correctness, no-write-replay, no-JavaScript, ownership cleanup,
      server authority, and accessible focus/error behavior are disqualifying hard gates.
- [ ] [AC-08] Sensitivity analysis and independent review show whether reasonable weights, missing
      demand, package upgrades, or excluding optional prefetch/regions/forms changes the result. Raw
      measurements and failed/extra events remain available rather than being reduced to one score.
- [ ] [AC-09] The decision selects browser+bridges, separately ticketed utilities, or native
      documents, explains why it fits jQStar's server-rendered non-SPA promise, states rejected
      alternatives/unknowns/revisit triggers, and does not call bridge feature differences defects
      unless the fixed workflow proves a consequence.
- [ ] [AC-10] A no-native or utility outcome marks each unapproved 0024–0029 ticket `declined`,
      links exact browser/bridge/utility guidance, and proves no `jquery-star/navigation`
      export/type/ sentinel/dependency/prototype/website claim ships. Utility work has a new
      Plan-validated ticket before implementation.
- [ ] [AC-11] A native-document outcome updates/Plan-validates 0024–0026 with exact eligibility,
      opt-in/fallback, request/final-policy, document/head/script/permanent-root,
      history/focus/scroll/ busy/error, observation/security, package, and frozen-reference metrics.
      It defines no routes and does not activate forms/regions/cache implicitly.
- [ ] [AC-12] Forms, regions, and prefetch each receive a separate approved/declined disposition and
      frozen contract. Forms require the no-dispatched-write-replay boundary; regions require exact
      response matching/fallback; prefetch requires explicit intent plus HTTP/private-data bounds.
- [ ] [AC-13] Architecture decision, raw evidence/schema, fixture/prototype exclusions,
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

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result  | Evidence                                 |
| --------- | ------- | ---------------------------------------- |
| _Not run_ | Planned | Verification commands are defined above. |

## Document

### Documentation changed

Pending.

### Acceptance evidence

Pending decision.

### Completion audit

Pending.

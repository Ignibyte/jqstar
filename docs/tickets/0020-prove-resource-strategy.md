---
id: 0020
title: Prove the asynchronous resource strategy
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0020: Prove the asynchronous resource strategy

## Plan

### Problem

A TanStack-style cache could duplicate an established library and move server authority into browser
copies. The project needs a real cross-root use case before committing to native resources,
optimistic mutations, cache keys, background state, and garbage collection. “Full framework” is not
itself evidence that jQStar should own another server-state system.

### Current evidence

- Current applications use local signals, named backend actions, request middleware/profiles, and
  server JSON/HTML/Datastar patches. The backend remains authoritative for validation, permissions,
  query results, record versions, and conflicts.
- The Project Browser already proves search/facets/multi-sort/grouping/pagination/virtual windows/
  editing through server-owned HTML and Datastar without a client query cache. Any resource proposal
  must improve a different observable problem rather than rewrite that success.
- Tickets 0018/0019 supply optional shared client coordination/preferences, not server-state caching
  or async boot. Shared stores can distribute a selected ID but do not deduplicate loaders or define
  stale/garbage-collection semantics.
- Ticket 0014 supplies runner-neutral external-plugin conformance and ticket 0017 stabilizes the
  platform before optional application services.
- No concrete duplicated-request fixture, external-client adapter, native prototype, predeclared
  decision rubric, package-maintenance audit, or follow-up activation record exists.
- As of the decision-plan review, official TanStack sources identify `@tanstack/query-core` as the
  framework-neutral cache/observer package. Its exact current version, license, dependencies,
  advisories, APIs, and maintenance status must be re-read and pinned when this ticket executes;
  “latest” is not reproducible evidence.

### Scope

- Build one Project Inspector research fixture around the existing Project Browser: a table root,
  pinned summary root, and activity root share a selected project ID. Summary/activity consumers
  need the same versioned project payload; selection changes/revisits, one-root removal,
  edits/conflicts, errors, and rapid A→B changes make duplicate async work and cancellation
  observable.
- Freeze identical user-visible behavior, deterministic endpoints/delays/failures, counters, initial
  server HTML, keyboard/focus/live-region output, and test assertions before implementing any
  strategy.
- Implement three isolated, non-published prototypes against the same fixture:
  1. one existing jQStar action with server HTML/Datastar patches and normal HTTP semantics;
  2. the smallest public jQStar adapter over an exact pinned maintained framework-neutral query core
     (initial candidate `@tanstack/query-core`, subject to execution-time evidence);
  3. the smallest plausible per-kernel native cache using only already approved jQStar ownership,
     observation, testing, and reactive capabilities.
- Prevent cross-contamination: each prototype has its own entry and dependency graph, uses the same
  endpoints/markup/interaction driver, imports no other prototype, and is excluded from package
  exports/root bundles/registry publication.
- Measure cold concurrent selection, warm revisit, rapid selection, one-consumer teardown,
  all-consumer teardown, edit invalidation, conflict, error/reset, navigation/preservation, and
  kernel disposal. Record request/abort counts, state transitions, settled DOM, focus/announcements,
  cache/timer/task residue, wall time under controlled delays, bundle bytes, source/test/docs/API
  footprint, dependencies, and maintenance/security obligations.
- Audit server/client authority for initial HTML, validation, version conflicts, canonical writes,
  stale rendering, no-JavaScript fallback, cache scoping at login/tenant changes, and whether
  endpoint or template coupling is materially improved/worsened.
- Define a weighted rubric plus non-negotiable gates before measuring. Native may win only when the
  actual workflow needs semantics server patches cannot provide cleanly, the external core plus thin
  adapter is materially unsuitable, and native yields an evidence-backed user/maintenance
  advantage—not merely a smaller demo API.
- Decide exactly one of: keep server patches/no official resource package; document or separately
  ticket an external adapter; or approve a native client. Record rejected alternatives, sensitivity
  analysis, maintenance owner/cadence, and the user-visible consequence of the choice.
- If server/external wins, mark tickets 0021 and 0022 `declined`, prove no native public/internal
  residue, and document the supported path. An external official adapter requires a new
  implementation ticket; it is not smuggled into this decision.
- If native wins, freeze the complete key/loader/cache/lease/cancellation/stale/GC/invalidation/
  render/observation/security contracts and update ticket 0021 before implementation. Ticket 0022
  remains conditional on evidence from the completed native reference app.

### Out of scope

- Publishing a stable resource API or optimistic mutation behavior.
- Treating feature count as evidence that native resources are needed.
- Replacing Project Browser's server-driven query/mutation architecture, moving permissions or
  validation into the browser, adding persistence/offline queues, or benchmarking React adapters.
- Publishing the prototypes, adding speculative package exports, committing an unselected runtime
  dependency, or using production consumers to hide prototype imports.
- Making a decision from lines of code, bundle size, popularity, or synthetic throughput alone.

### Dependencies

- Tickets 0014 and 0017.

### Acceptance criteria

- [ ] [AC-01] The Project Inspector reference workflow is fixed before prototypes: three independent
      jQStar roots, one selected project/version, duplicated summary/activity demand, deterministic
      endpoints/delays/errors/counters, initial server HTML, selection/revisit/rapid-change/edit/
      conflict/removal/navigation/disposal flows, and exact keyboard/focus/live-region outcomes.
- [ ] [AC-02] Server patches, the exact pinned external query core plus thin adapter, and the
      minimal native prototype run through the same markup/endpoints/interaction driver/assertions
      with separate entries/graphs. No prototype imports another, changes endpoint semantics, or
      receives a strategy-specific relaxation.
- [ ] [AC-03] Each strategy records cold/warm/revisit request and abort counts, concurrent dedupe,
      per-consumer/all-consumer teardown, edit invalidation/conflict, error/reset, state
      transitions, settled latency under controlled delays, cache/task/timer residue, and exact
      terminal public disposal evidence.
- [ ] [AC-04] Measurements include raw/gzip executable bytes with module graphs, install/package
      bytes, direct/transitive dependencies/licenses/advisories, production/test/docs/type source
      footprint, public concepts, setup/upgrade work, debugging/inspection needs, browser support,
      and an explicit annual maintenance estimate with measurement method and uncertainty.
- [ ] [AC-05] All strategies preserve useful server-rendered initial/no-JavaScript HTML, server
      validation/authorization/version authority, native forms, stable focus, accessible loading/
      error/empty/live updates, cancellation, render preservation, and correct behavior after one or
      every root is removed. A cache never becomes the write authority.
- [ ] [AC-06] External-client research uses official package/docs/repository/release/security
      sources, pins exact tarball/integrity and API calls, exercises only the framework-neutral
      core, records maintenance recency/dependencies/license/browser compatibility, and
      distinguishes external behavior from adapter code. It can be rerun without a floating `latest`
      dependency.
- [ ] [AC-07] The native prototype is the minimum implementation needed for the fixed workflow and
      remains unexported. It cannot score credit for features the workflow does not exercise; every
      cache/key/lease/timer/fetch/observer has a public-conformance owner and disposal assertion.
- [ ] [AC-08] A rubric frozen before results weights user-observable correctness/benefit,
      server/HTML authority, lifecycle/cancellation, shipped cost, implementation/testing
      complexity, maintenance/security, interoperability, and accessibility. Non-negotiable
      correctness, ownership, no-JavaScript, and server-authority failures disqualify a strategy
      regardless of weighted score; sensitivity analysis shows whether reasonable weight changes
      alter the winner.
- [ ] [AC-09] The architecture decision names one outcome, presents raw data and score calculation,
      explains why it fits jQStar's server-rendered product better than each alternative, records
      tradeoffs/unknowns/rejected options, and states what evidence would justify revisiting it.
- [ ] [AC-10] A server-patch/no-package outcome documents the recommended composition and marks
      0021/ 0022 `declined`; an external outcome defines the supported public integration and either
      a new implementation ticket or documentation-only recipe before declining 0021/0022. Both
      prove no resource/mutation export, sentinel, dependency, docs claim, or hidden native source
      ships.
- [ ] [AC-11] A native outcome updates and Plan-validates ticket 0021 with exact cache owner, key
      grammar/canonicalization/limits, loader identity/conflicts, record state machine, application
      leases, request/cancellation ownership, stale/GC clocks, invalidation, initial HTML/data,
      reactive/render integration, observation/redaction, disposal, package graph, and frozen
      reference metrics. It does not activate mutations.
- [ ] [AC-12] The decision, evidence dataset, schemas, fixture/prototype exclusions, public/project-
      brain docs, roadmap dispositions, focused/browser/package checks, `npm run check`, and
      `git diff --check` pass without mutation testing or unselected production code.

### Design

The fixed fixture models one real tension: separate progressive-enhancement roots should not each
invent loading/error/cancellation state for the same read, but the server can already answer one
action with coordinated HTML patches. A deterministic server exposes project summary/activity read
data plus the existing versioned edit/conflict path. All variants start from the same meaningful
HTML and produce the same DOM/state announcements.

The server strategy uses one named action and official Datastar SDK patches to update both consumer
regions. The external strategy wraps only the public observer/client primitives of an exact pinned
framework-neutral query core and maps its result into jQStar reactive state. The native prototype
implements only acquire/read/release/invalidate/reset needed by the fixture. Prototypes live under a
research/test-only boundary rejected by production census and export-map checks.

Measurement uses a controlled request server/clock where semantic counts matter and real browsers
where fetch abort, focus, DOM, accessibility, navigation, and lifecycle matter. Latency results
report environment, repetitions, median/p95, and noise; they cannot dominate correctness. Source
footprint counts owned adapter/runtime/test/docs/types separately. Dependency evidence records exact
package integrity and retrieval time.

The rubric frozen in advance totals 100 points: user-observable benefit/correctness 25, preservation
of server/HTML authority 20, lifecycle/cancellation/disposal 15, shipped/runtime cost 10,
implementation/ testing complexity 10, maintenance/security/supply chain 10,
interoperability/upgrade risk 5, and accessibility/progressive enhancement 5. Score inputs have
named measurement rules. Correctness, server authority, ownership cleanup, accessible equivalent
output, and no-JavaScript HTML are hard gates.

Native approval additionally requires all three findings: the fixed workflow exposes a material
user/operational gap in the server strategy; a thin external-core adapter cannot close it within
acceptable shipped/maintenance cost; and the native prototype closes it with a smaller long-term
burden under the sensitivity analysis. Otherwise choose server/no package or external integration.

### Decisions

- Use Project Inspector, not a greenfield todo list or rewritten Project Browser, as the decision
  fixture.
- Compare one server-patch composition, one exact framework-neutral external core, and one minimal
  native prototype. Framework adapters and React-specific APIs are irrelevant.
- Freeze behavior, rubric, disqualifying conditions, and measurement method before implementation
  results.
- Preserve server-rendered HTML and server write authority in every strategy.
- Keep every prototype unexported and unshipped. The decision ticket may publish evidence/docs, not
  a speculative runtime API.
- “No official resource package” is a successful terminal decision. An external adapter needs its
  own implementation ticket if it is more than a documented recipe.
- Mutation work cannot be inferred from a resource decision; ticket 0021 must make a second explicit
  decision after a completed native reference application.

### Security and accessibility

- Fixture data uses non-sensitive deterministic projects. Logs/reports contain route IDs, counts,
  timings, keys hashes, and state categories—not credentials, response bodies, HTML, project values,
  headers, cookies, or DOM references.
- Every strategy uses the same same-origin credential/CSRF/server validation/authorization boundary.
  A cache key does not grant access, and cached data must be scoped/disposed on identity or tenant
  changes documented by the host.
- External packages are pinned by tarball integrity and audited from official sources. Prototype
  dependencies cannot enter published manifests/artifacts unless a later approved ticket owns them.
- Initial HTML, native links/forms, keyboard selection, focus after updates/errors/conflicts,
  live-region announcements, reduced motion, forced colors, zoom/reflow, and JavaScript-disabled
  behavior are common hard-gate assertions.

### Risks

- A contrived demo can predetermine the result. Use an existing workflow or a requirement that
  cannot be solved by moving one action into a block.
- External query clients may carry framework adapters not needed here. Compare their core package.
- Prototype quality can bias the winner. Freeze behavior, staff each to the same acceptance matrix,
  inspect failures independently, and separate adapter code from dependency capability.
- Cache-revisit scenarios can unfairly penalize server patches while ignoring HTTP caching or one
  coordinated patch. Include cold/warm/revisit data and record what the server can solve directly.
- Bundle size or LOC can hide maintenance complexity; popularity can hide jQStar integration cost.
  Use the full rubric and sensitivity analysis.
- An external package can change during research. Pin exact tarball/integrity and date-stamp
  official maintenance/security evidence.
- A native prototype can accidentally become production by being imported into an example or
  registry block. Enforce research-only paths in export, production census, package, and graph
  gates.

### Verification plan

- Validate this Plan, fixed fixture contract, rubric, and hard gates before writing prototypes.
- Add one parameterized conformance driver for all strategies covering cold concurrent use, warm
  revisit, rapid A→B, per/all lease removal, edit invalidation/conflict, error/reset, navigation/
  preservation, no JavaScript, and kernel disposal with exact request/abort/state/resource counters.
- Run deterministic unit/integration repetitions and Chromium/Firefox/WebKit accessibility/lifecycle
  flows; retain raw JSON measurements plus normalized summaries and environment/tool versions.
- Bundle each isolated entry with the same tool/minification target; inspect module graphs,
  dependency licenses/advisories/integrity, browser support, source/test/docs/type footprint, API
  concepts, and production exclusion.
- Independently review server authority, cancellation races, stale/error semantics, root/kernel
  disposal, cache scope, focus/announcements, measurement bias, maintenance estimate, and rubric
  sensitivity before recording the decision.
- Update/validate the architecture decision, roadmap, 0021/0022 terminal/activation state, and any
  new external-adapter ticket. Prove unselected prototypes/dependencies/exports do not ship.
- Run focused suites, relevant browser/package checks, docs/schema/static validation,
  `npm run check`, ticket Test/Document validation, and `git diff --check` without mutation testing.

### Planned files

- `docs/decisions/RESOURCE_STRATEGY.md`: Fixed problem/workflow, alternatives, raw metrics, rubric,
  sensitivity analysis, authority/maintenance/security review, decision, rejected paths, revisit
  triggers, and downstream disposition.
- `quality/resource-strategy.json`, `schema/resource-strategy.schema.json`: Fixture version,
  predeclared rubric/hard gates, exact external package provenance, raw/summary measurements,
  decision enum, and required downstream links.
- `test/fixtures/resource-strategy/`: Shared Project Inspector markup/routes/data/driver plus
  isolated server, external-core, and native research entries excluded from production/package
  exports.
- `server/` or fixture-local server adapter: Deterministic summary/activity/versioned edit
  endpoints, delays/failures/counters, and official Datastar SDK responses for the server strategy.
- `test/resource-strategy.test.ts`, `e2e/resource-strategy.spec.ts`: Parameterized semantic/request/
  lifecycle/accessibility matrix and three-browser flows.
- `scripts/measure-resource-strategy.mjs`: Exact bundle/graph/LOC/test/dependency measurement with
  immutable raw output and no automatic decision.
- `package.json`, `package-lock.json`: Exact research-only alias/tarball dependency and focused
  commands, removed again when its strategy is not selected for a separate implementation ticket.
- `docs/tickets/0021-build-resource-client.md`, `docs/tickets/0022-add-resource-mutations.md`,
  `docs/tickets/ROADMAP.md`: Approved native contract or terminal declined disposition plus any new
  external-adapter implementation ticket.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,TESTING,RUNTIME_OWNERSHIP}.md`, website resource
  guidance: Selected supported pattern, authority boundary, optionality, and non-shipped
  alternatives.
- `docs/tickets/0020-prove-resource-strategy.md`: Phase, ledger, commands, findings, rubric results,
  criterion evidence, and completion audit.

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

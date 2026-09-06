---
id: 0020
title: Prove the asynchronous resource strategy
status: done
created: 2026-08-30
updated: 2026-09-06
---

# 0020: Prove the asynchronous resource strategy

## Plan

### Problem

A TanStack-style cache could duplicate an established library and move server authority into browser
copies. The project needs a real cross-root use case before committing to native resources,
optimistic mutations, cache keys, background state, and garbage collection. “Full framework” is not
itself evidence that jQStar should own another server-state system.

### Current evidence

- Execution started from persistence commit `e797dc9`. Tickets 0014, 0017, 0018 and 0019 are done.
- The before-implementation workflow, scenario matrix, rubric and measurement rules are frozen in
  [RESOURCE_STRATEGY.md](../decisions/RESOURCE_STRATEGY.md), contract `project-inspector/1`.
- The three application roots share an outer table/coordinator boundary because existing backend
  actions correctly scope patches to their initiating application. Consumer roots keep independent
  application identities and teardown. Every strategy uses this identical topology.
- Research dependencies use a private exact-locked fixture package instead of temporarily changing
  the root dependency tree. This preserves reproducibility without shipping an unselected package.

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
- Before this ticket, no concrete duplicated-request fixture, external-client adapter, native
  prototype, predeclared decision rubric, package-maintenance audit, or follow-up activation record
  existed.
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

- [x] [AC-01] The Project Inspector reference workflow is fixed before prototypes: three independent
      jQStar roots, one selected project/version, duplicated summary/activity demand, deterministic
      endpoints/delays/errors/counters, initial server HTML, selection/revisit/rapid-change/edit/
      conflict/removal/navigation/disposal flows, and exact keyboard/focus/live-region outcomes.
- [x] [AC-02] Server patches, the exact pinned external query core plus thin adapter, and the
      minimal native prototype run through the same markup/endpoints/interaction driver/assertions
      with separate entries/graphs. No prototype imports another, changes endpoint semantics, or
      receives a strategy-specific relaxation.
- [x] [AC-03] Each strategy records cold/warm/revisit request and abort counts, concurrent dedupe,
      per-consumer/all-consumer teardown, edit invalidation/conflict, error/reset, state
      transitions, settled latency under controlled delays, cache/task/timer residue, and exact
      terminal public disposal evidence.
- [x] [AC-04] Measurements include raw/gzip executable bytes with module graphs, install/package
      bytes, direct/transitive dependencies/licenses/advisories, production/test/docs/type source
      footprint, public concepts, setup/upgrade work, debugging/inspection needs, browser support,
      and an explicit annual maintenance estimate with measurement method and uncertainty.
- [x] [AC-05] All strategies preserve useful server-rendered initial/no-JavaScript HTML, server
      validation/authorization/version authority, native forms, stable focus, accessible loading/
      error/empty/live updates, cancellation, render preservation, and correct behavior after one or
      every root is removed. A cache never becomes the write authority.
- [x] [AC-06] External-client research uses official package/docs/repository/release/security
      sources, pins exact tarball/integrity and API calls, exercises only the framework-neutral
      core, records maintenance recency/dependencies/license/browser compatibility, and
      distinguishes external behavior from adapter code. It can be rerun without a floating `latest`
      dependency.
- [x] [AC-07] The native prototype is the minimum implementation needed for the fixed workflow and
      remains unexported. It cannot score credit for features the workflow does not exercise; every
      cache/key/lease/timer/fetch/observer has a public-conformance owner and disposal assertion.
- [x] [AC-08] A rubric frozen before results weights user-observable correctness/benefit,
      server/HTML authority, lifecycle/cancellation, shipped cost, implementation/testing
      complexity, maintenance/security, interoperability, and accessibility. Non-negotiable
      correctness, ownership, no-JavaScript, and server-authority failures disqualify a strategy
      regardless of weighted score; sensitivity analysis shows whether reasonable weight changes
      alter the winner.
- [x] [AC-09] The architecture decision names one outcome, presents raw data and score calculation,
      explains why it fits jQStar's server-rendered product better than each alternative, records
      tradeoffs/unknowns/rejected options, and states what evidence would justify revisiting it.
- [x] [AC-10] A server-patch/no-package outcome documents the recommended composition and marks
      0021/ 0022 `declined`; an external outcome defines the supported public integration and either
      a new implementation ticket or documentation-only recipe before declining 0021/0022. Both
      prove no resource/mutation export, sentinel, dependency, docs claim, or hidden native source
      ships.
- [ ] [AC-11] A native outcome updates and Plan-validates ticket 0021 with exact cache owner, key
      grammar/canonicalization/limits, loader identity/conflicts, record state machine, application
      leases, request/cancellation ownership, stale/GC clocks, invalidation, initial HTML/data,
      reactive/render integration, observation/redaction, disposal, package graph, and frozen
      reference metrics. It does not activate mutations.
- [x] [AC-12] The decision, evidence dataset, schemas, fixture/prototype exclusions, public/project-
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
- `package.json`, private fixture `package.json`/`package-lock.json`: Exact private research
  dependency and focused commands. Root dependency declarations and lock remain unchanged.
- `docs/tickets/0021-build-resource-client.md`, `docs/tickets/0022-add-resource-mutations.md`,
  `docs/tickets/ROADMAP.md`: Approved native contract or terminal declined disposition plus any new
  external-adapter implementation ticket.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,TESTING,RUNTIME_OWNERSHIP}.md`, website resource
  guidance: Selected supported pattern, authority boundary, optionality, and non-shipped
  alternatives.
- `docs/tickets/0020-prove-resource-strategy.md`: Phase, ledger, commands, findings, rubric results,
  criterion evidence, and completion audit.

### Reopening decision: zoom reflow across fonts, 2026-09-06

Hosted full audit `34017660083` fails the existing Project Inspector S15 zoom assertion on Linux.
All three strategies share the same stylesheet. The page heading lacks a wrapping fallback when a
word exceeds the available width after text enlargement. A local diagnostic with the existing 640px
viewport, 200% root font size, 2x body zoom, and a wide monospace fallback reproduces a 755px
document. Applying inherited `overflow-wrap: anywhere` restores 640px without clipping content.

Reopen AC-05 and AC-12. Amend only shared typography in `test/fixtures/resource-strategy/style.css`,
and extend the existing S15 driver in `e2e/resource-strategy.spec.ts` to verify the normal system
font and a wider fallback. Preserve native table scrolling, full text, forms, focus, all strategies,
existing zoom/axe assertions, and all frozen strategy semantics. Keep the original research
measurements and rubric as historical decision evidence. This shared accessibility correction does
not change executable bundles, request semantics, or the server-patch decision.

Validate Plan, retain the failing font probe, run focused browser reflow/axe checks for all three
strategies, then fast and full delivery checks. The first fast run rejects the recorded stylesheet
digest, so rerun the complete 87-execution browser comparison and 45-sample measurement command,
record the current fixture inventory in `quality/resource-strategy.json`, and recompute scores with
the existing rubric. Preserve prior raw measurements in their immutable directories and Git history.
Record the current correction in the decision appendix and this ticket. Hosted full-audit
verification remains tracked by 0052. Fresh source and browser evidence supersedes only the failed
current accessibility claim, not the original raw data.

## Code

Current correction: `test/fixtures/resource-strategy/style.css` permits long text to wrap, and
`e2e/resource-strategy.spec.ts` keeps S15 reflow checks under system and wider fallback fonts.
`docs/decisions/RESOURCE_STRATEGY.md` records the shared correction without rewriting raw research.

### Changed-file ledger

| File                                                                                                 | Purpose                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/decisions/RESOURCE_STRATEGY.md`                                                                | Frozen workflow, scenario matrix, rubric and measurement rules.                                 |
| `quality/resource-strategy.json`, `schema/resource-strategy.schema.json`                             | Exact provenance, closed evidence schema, raw samples, graphs and source digests.               |
| `test/fixtures/resource-strategy/types.ts`, `html.mjs`, `html.d.mts`, `style.css`, `server.mjs`      | Shared project contract, native HTML, deterministic SDK server and counters.                    |
| `test/fixtures/resource-strategy/common.ts`                                                          | Public jQStar installation, application leases, selection, forms, rendering and inspection.     |
| `test/fixtures/resource-strategy/server-entry.ts`, `server-strategy.ts`                              | Isolated server coordinator using existing backend actions.                                     |
| `test/fixtures/resource-strategy/native-entry.ts`, `native.ts`                                       | Minimal isolated native read cache prototype.                                                   |
| `test/fixtures/resource-strategy/external/`                                                          | Exact private Query Core package, lockfile and public observer adapter.                         |
| `test/fixtures/resource-strategy/baseline-entry.ts`, `instrumentation.mjs`, `instrumentation.d.mts`  | Common bundle baseline and real-browser timer instrumentation.                                  |
| `scripts/prepare-resource-strategy.mjs`, `scripts/measure-resource-strategy.mjs`                     | Exact fixture preparation, independent bundles and reproducible raw measurements.               |
| `test/resource-strategy.test.ts`                                                                     | Public plugin conformance, rollback, retained leases and cancellation.                          |
| `test/resource-strategy-server.test.mjs`                                                             | Identical HTML, media negotiation, ETags, native forms, server authority and session isolation. |
| `test/resource-strategy-contract.test.mjs`                                                           | Closed schema, provenance, complete samples, source digests and graph isolation.                |
| `e2e/resource-strategy.spec.ts`, `e2e/fixtures/resource-strategy-server.mjs`, `playwright.config.ts` | Shared scenario driver, redacted attachments, browser profiles and isolated server.             |
| `tsconfig.json`, `knip.json`, `.dependency-cruiser.cjs`                                              | Public stores resolution, private fixture workspace and import boundaries.                      |
| `package.json`, `scripts/quality-package.mjs`, `scripts/quality/validate-json.mjs`                   | Research commands, schema enforcement and packed manifest/file/module exclusions.               |
| `cspell.json`                                                                                        | Technical vocabulary for the frozen line-count method.                                          |
| `docs/tickets/0020-prove-resource-strategy.md`                                                       | Execution plan, file ledger, commands, failures and inspection evidence.                        |
| `scripts/score-resource-strategy.mjs`, `scripts/quality/resource-strategy-score.mjs`                 | Recompute frozen arithmetic and all 177147 sensitivity cases without selecting an outcome.      |
| `scripts/record-resource-strategy-browser.mjs`                                                       | Preserve all 87 successful redacted observations and nine disposal reports.                     |
| `quality/gates.mjs`                                                                                  | Verify/install the private exact dependency before unit/static checks on clean checkouts.       |
| `README.md`, `CHANGELOG.md`, `example/docs/datastar/index.html`                                      | Supported server coordination and canonical-write guidance.                                     |
| `docs/{README,ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING,DEVELOPMENT,LIBRARY_EXPANSION_PLAN}.md` | Decision, ownership, test/development reproduction and conditional-design disposition.          |
| `docs/tickets/{ROADMAP,0021-build-resource-client,0022-add-resource-mutations}.md`                   | Terminal declined track and explicit criterion dispositions.                                    |
| `example/agent-content.generated.json`, `example/public/{jqstar-agent-index.json,llms-full.txt}`     | Regenerated public agent corpus from Datastar guidance.                                         |
| `test/quality-runner.test.mjs`                                                                       | Require private dependency preparation before unit checks in all three canonical modes.         |
| `test/fixtures/csp/conformance-map.json`                                                             | Regenerate README expression locations after public guidance moved line numbers.                |

### Design changes

The frozen comparison uses independent nested consumer roots to respect existing patch scope, and a
private exact-locked dependency fixture to keep unselected packages out of the root tree. Canonical
gate preparation verifies this private dependency before unit/static checks; direct research tests
require preparation. No production API or behavior changed.

## Test

Current reflow correction:

| Command                                                                                   | Result | Evidence                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                                    | Pass   | Run `2026-09-06T12-28-37-589Z-76827` passes all six gates and 1,254 unit tests after the resource evidence refresh; Code-phase validation accepted the exact report.                                  |
| Local wide-font diagnostic before correction                                              | Fail   | Existing zoom settings yield 755px document width in a 640px viewport; retained `resource-zoom-wrap-probe.json` records the shared wrapping correction restoring 640px.                               |
| `npm run quality:fast`                                                                    | Fail   | Run `2026-09-06T12-23-35-042Z-69377` passes 1,253 of 1,254 unit tests; the resource-contract test correctly rejects the old stylesheet digest. Full browser/measurement refresh is required.          |
| `npx playwright test e2e/resource-strategy.spec.ts --project=zoom-reflow --repeat-each=2` | Pass   | Six executions cover all three strategies with system and wider fallback fonts, no retries or skips, and zero axe violations. Reports are under `.git/jqstar/program-audit/resource-reflow-browser/`. |

The complete comparison now passes 87 browser executions with no failures, retries or skips. The 20
focused strategy/server/contract tests pass. Current measurements contain all 45 samples in
`.git/jqstar/resource-strategy/measurements/2026-09-06T12-27-37.698Z/raw.json`, digest
`03b11a71ea16bce61e4aaef77555a7cd2cd0056630c1b52c4c5fe0b39f3906bf`. Recomputed scores remain server
91, external 92, native 90; the complete sensitivity result is unchanged. The public decision tables
now use the new latency and official Node 24 gzip measurements. Required fast and delivery checks
must still pass after this evidence refresh.

Historical implementation evidence:

| Command                                                                                                                                 | Result                                 | Evidence                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:receipt` before checkpoint                                                                                             | Pass                                   | Exact ticket-0019 receipt matched before persistence commit `e797dc9`.                                                                                                                                                                                    |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0020-prove-resource-strategy.md`                                         | Pass                                   | Behavior and rubric frozen before prototypes.                                                                                                                                                                                                             |
| `npm install --prefix test/fixtures/resource-strategy/external --ignore-scripts --no-fund --no-audit`                                   | Pass                                   | One pinned private fixture package; root dependency tree unchanged.                                                                                                                                                                                       |
| `npm audit --prefix test/fixtures/resource-strategy/external --json`                                                                    | Pass                                   | Zero known advisories in the dated exact-package audit.                                                                                                                                                                                                   |
| Registry metadata/tarball retrieval and SHA-512 verification                                                                            | Pass                                   | Version 5.102.8, 297025 tarball bytes, matching registry and lockfile integrity.                                                                                                                                                                          |
| `node scripts/prepare-resource-strategy.mjs` initial                                                                                    | Pass; browser issue found later        | All entries bundled; the external browser proof subsequently required production-environment replacement.                                                                                                                                                 |
| `npx tsc -p tsconfig.quality.test.json` initial                                                                                         | Fail, corrected                        | Added the public stores alias and correctly typed the browser timer override.                                                                                                                                                                             |
| Focused ESLint initial                                                                                                                  | Fail, corrected                        | Promise-presence predicates now return booleans; rejected test promises use Error objects.                                                                                                                                                                |
| `npx playwright test e2e/resource-strategy.spec.ts --project=desktop-chromium --grep 'initial HTML' --max-failures=1`                   | Fail, corrected                        | Explicit identical production environment replacement fixes external `process` reference.                                                                                                                                                                 |
| Focused TypeScript and ESLint after correction                                                                                          | Pass                                   | Prototype, instrumentation and driver types/lint passed.                                                                                                                                                                                                  |
| `npx playwright test e2e/resource-strategy.spec.ts --project=desktop-chromium --max-failures=3`                                         | Pass                                   | 18 initial browser executions across all strategies.                                                                                                                                                                                                      |
| `npx vitest run test/resource-strategy.test.ts` initial                                                                                 | Fail, corrected                        | Failed-install tests exposed cache allocations made before host activation; immediate rollback cleanup added.                                                                                                                                             |
| `npx vitest run test/resource-strategy.test.ts test/resource-strategy-server.test.mjs`                                                  | Pass                                   | 11 ownership/server tests, including retained-lease disposal and canonical-write contracts.                                                                                                                                                               |
| Initial complete browser matrix                                                                                                         | Fail, corrected                        | Warm origin reads are measured rather than forced to zero. Focus preservation uses common keyboard activation.                                                                                                                                            |
| WebKit, mobile, motion, colors and zoom matrix                                                                                          | Pass                                   | 36 executions; JS-disabled selectors were corrected separately.                                                                                                                                                                                           |
| Initial JS-disabled text checks                                                                                                         | Fail, corrected                        | Playwright text matching skips noscript content. Direct CSS location and DOM text inspection prove the visible paragraph.                                                                                                                                 |
| `npx playwright test e2e/resource-strategy.spec.ts --project=javascript-disabled --max-failures=1` after correction                     | Pass                                   | Three actual JS-disabled native navigation, edit and redirect flows.                                                                                                                                                                                      |
| `node scripts/measure-resource-strategy.mjs --record` initial                                                                           | Pass, superseded                       | 45 samples collected; repeated after retained-state fixes.                                                                                                                                                                                                |
| `npx vitest run test/resource-strategy-contract.test.mjs` initial                                                                       | Fail, corrected                        | Rollup removes re-export facades. Graph proof checks emitted trusted runtime plus stores.                                                                                                                                                                 |
| `npx vitest run test/resource-strategy-contract.test.mjs` after correction                                                              | Pass                                   | Six provenance, schema, graph and complete-sample checks.                                                                                                                                                                                                 |
| `npm run quality:census`                                                                                                                | Pass                                   | 362 artifacts classified at that point; prototypes excluded from production census.                                                                                                                                                                       |
| `node scripts/measure-resource-strategy.mjs --record` after lifecycle review                                                            | Pass; source typing changed later      | 45 refreshed samples in `.git/jqstar/resource-strategy/measurements/2026-09-05T20-04-35.652Z/raw.json`.                                                                                                                                                   |
| `npx playwright test e2e/resource-strategy.spec.ts --max-failures=1`                                                                    | Pass; rapid-case driver extended later | 87 executions across all eight required browser profiles, zero failures/flakes/skips.                                                                                                                                                                     |
| `npm run quality:fast` run `2026-09-05T20-07-53-782Z-64934`                                                                             | Fail, corrected                        | API extraction reached a source type through a test declaration file. Static checks found schema draft, private workspace, ticket-table and vocabulary mismatches.                                                                                        |
| `node scripts/build-types.mjs` after declaration repair                                                                                 | Pass                                   | All 11 public API extraction entries remain unchanged.                                                                                                                                                                                                    |
| `npx knip --config knip.json` after workspace repair                                                                                    | Pass                                   | Explicit private workspace and root entry/project declarations retain complete unused-code analysis.                                                                                                                                                      |
| Focused rapid-selection/preservation replay                                                                                             | Pass                                   | 18 executions across Chromium, Firefox and WebKit.                                                                                                                                                                                                        |
| Final focused resource browser matrix                                                                                                   | Pass                                   | 87 executions, no retries/skips; `.git/jqstar/resource-strategy/final-browser/results.json`, SHA-256 `9ee52433d87c2d83d76da5a536f0588ac6921e71b3bef9436fb41ad87a5c83aa`. All normalized observations are in `quality/resource-strategy.json`.             |
| `node scripts/score-resource-strategy.mjs --record`                                                                                     | Pass                                   | Nominal server/external/native scores 91/92/90; all 177147 sensitivity cases retained.                                                                                                                                                                    |
| Final focused unit/server/contract run                                                                                                  | Pass                                   | 20 tests including schema/decision negative cases, arithmetic, browser coverage, ownership and HTTP contracts.                                                                                                                                            |
| Terminal schema strict validation                                                                                                       | Fail, corrected                        | Conditional property schemas now explicitly declare object types; unit schema compilation also uses strict mode.                                                                                                                                          |
| Final fixture TypeScript check                                                                                                          | Fail, corrected; Pass on replay        | Local test window types intersect the actual window type; no global augmentation or production declarations were added.                                                                                                                                   |
| Empty private installation plus `--install-only` preparation                                                                            | Pass                                   | Reinstalled exact query-core 5.102.8 without root dependency or lock changes.                                                                                                                                                                             |
| `npm run quality:fast` run `2026-09-05T20-29-53-718Z-81223`                                                                             | Fail, corrected                        | Static checks passed. Canonical gate-membership proof needed the new required preparation step; CSP conformance locations needed regeneration after README edits.                                                                                         |
| `npm run quality:fast` run `2026-09-05T20-31-27-724Z-92743`                                                                             | Pass                                   | All six gates passed: workflow, runner, private dependency, format, all unit tests and static analysis.                                                                                                                                                   |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0020-prove-resource-strategy.md --report .git/jqstar/latest-report.json` | Pass                                   | Code closure bound to the unchanged green fast tree before moving to testing.                                                                                                                                                                             |
| Final `npm run research:resources:measure -- --record`                                                                                  | Pass                                   | 45 fresh samples; raw `.git/jqstar/resource-strategy/measurements/2026-09-05T20-29-23.535Z/raw.json`, SHA-256 `53653500beddff85e9746c578f77932747d92ef152fcd11794a4deb5d746b66f`; current fixture digests and refreshed source/test/docs/tool footprints. |
| `npm run build:agent-content` and `npm run csp:inventory`                                                                               | Pass                                   | Public agent corpus and README expression locations regenerated.                                                                                                                                                                                          |
| `npm run check` (`quality:delivery`), run `2026-09-05T20-32-56-549Z-4971`                                                               | Pass                                   | All 13 enforced gates: 1034 unit tests, coverage/property/static, self-hosted build, 13 package checks, seven release checks, 448 browser executions and detector self-tests. Receipt matched the unchanged tree.                                         |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0020-prove-resource-strategy.md --report .git/jqstar/latest-report.json` | Pass                                   | Test closure bound to the current passing delivery report and receipt before documenting.                                                                                                                                                                 |
| `git diff --check`                                                                                                                      | Pass                                   | No whitespace errors in the completed implementation and guidance.                                                                                                                                                                                        |
| Final delivery attempt `2026-09-05T20-49-00-053Z-58005`                                                                                 | Interrupted, corrected                 | Stopped at startup to remove a stale pending-verification label in the decision document. The earlier complete delivery passed; the corrected terminal tree is verified by the final receipt.                                                             |
| Corrected full delivery `2026-09-06T12-30-22-478Z-89670`                                                                                | Pass                                   | Twelve executed gates pass with 1,254 unit tests and 484 browser cases. The unchanged 0044 detector is conditionally skipped, not counted as a pass. Resource source digests, package and release checks pass.                                            |
| Corrected Test phase before commit `e6a57ca`                                                                                            | Pass                                   | Validator accepted the exact delivery report and current receipt before the corrected source was committed and pushed.                                                                                                                                    |

### Inspection ledger

| Inspection                    | Finding                                                                                          | Resolution                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Patch scope                   | Backend actions cannot patch sibling applications outside their boundary.                        | All strategies use the same outer coordinator and independent nested consumer roots.                           |
| External browser boot         | Library-mode output retained a development environment reference.                                | Use identical explicit production replacement in every bundle.                                                 |
| Failed installation           | Staged document ownership does not release earlier synchronous allocations.                      | Immediate idempotent registrar cleanup complements committed host service ownership.                           |
| Inactive invalidation         | A second external key set could outlive query GC.                                                | Read public Query Core invalidation state; remove the redundant set.                                           |
| Retained lease after disposal | Native release could schedule GC after terminal cleanup.                                         | Terminal release guard and direct timer-allocation regression in both clients.                                 |
| Preserved focus               | The first preservation scenario focused a sibling outside the moved root.                        | Focus the preserved summary before moving and assert node/app/focus identity.                                  |
| Rapid selection deadline      | The first rapid scenario used B/C and checked cancellation before the old deadline.              | Use the specified slow A/B sequence and inspect final B after the original A deadline.                         |
| Public declaration boundary   | A test declaration imported a source TypeScript file while API extraction expected declarations. | Make the HTML declaration self-contained. Fixture window types also remain local, without global augmentation. |
| Quality integration           | Schema dialect and nested dependency ownership must match repository tools.                      | Use JSON Schema 2020-12, an explicit private Knip workspace, and direct instance validation.                   |

## Document

### Documentation changed

The decision document and dataset record the frozen comparison, provenance, raw measurements,
score/sensitivity calculation, ownership review, limits and revisit triggers. README and public
Datastar guidance explain the supported composition. Brain architecture, project, ownership, testing
and development docs record boundaries and reproduction. The expansion plan, roadmap and conditional
tickets record the declined native track. Generated agent content follows public docs.

### Acceptance evidence

| Criterion | Result               | Evidence                                                                                                                                                                                                                                                                                                       |
| --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass                 | Frozen `project-inspector/1` contract and SHA-256 in `docs/decisions/RESOURCE_STRATEGY.md` and `quality/resource-strategy.json`; Plan validation preceded implementation.                                                                                                                                      |
| AC-02     | Pass                 | Common HTML/server/driver in `test/fixtures/resource-strategy/` and `e2e/resource-strategy.spec.ts`; three independent measured module graphs and production import boundaries.                                                                                                                                |
| AC-03     | Pass                 | 45 fresh measurements and 87 retained browser observations cover request counts, races, state, latency and residue. Nine browser disposal reports plus public-conformance tests prove cleanup.                                                                                                                 |
| AC-04     | Pass                 | Dataset records bundles/graphs, package integrity/size/license/audit, fixture and shared support footprints, named concepts/transitions, annual estimates and uncertainty.                                                                                                                                     |
| AC-05     | Pass                 | Corrected 87-case browser matrix proves initial/no-JavaScript HTML, native forms, canonical writes/conflicts/permissions, focus, live regions, teardown, identity changes and preservation. S15 passes both system and monospace fonts at the existing zoom settings; no clipping or assertion relaxation.     |
| AC-06     | Pass                 | Private exact query-core 5.102.8 lock, verified tarball SHA-512, dated official sources/audit and public QueryClient/QueryObserver adapter. Empty-install preparation succeeded.                                                                                                                               |
| AC-07     | Pass                 | Native prototype remains test-only. Public conformance and direct retained-lease/last-release tests prove failed-install rollback, cancellation and terminal timer ownership.                                                                                                                                  |
| AC-08     | Pass                 | Frozen rubric, explicit inspection inputs, hard-gate rejection tests, exact score recomputation and all 177147 sensitivity cases are retained and validated.                                                                                                                                                   |
| AC-09     | Pass                 | Decision selects server patches under the predeclared inconclusive rule: server/external/native 91/92/90. It records tradeoffs, ranking sensitivity, uncertainty, owner/cadence and revisit triggers.                                                                                                          |
| AC-10     | Pass                 | Tickets 0021 and 0022 are declined. Public composition docs, root manifest/lock checks, production import restrictions and installed-package graphs/files prove no native API or unselected dependency ships.                                                                                                  |
| AC-11     | Approved-Disposition | Native was not selected and fails the three additional approval findings. The frozen decision and activation rules reject this conditional branch; neither native resources nor mutations are activated.                                                                                                       |
| AC-12     | Pass                 | Delivery `2026-09-06T12-30-22-478Z-89670` passes 1,254 unit tests, all 484 browser cases, 13 package checks and seven release checks. Current schema/digests, 45 measurements, 87 resource browser cases, scores and sensitivity pass; Test validation succeeded before commit `e6a57ca`. No mutation testing. |

### Previous completion audit (superseded 2026-09-06)

The audit maps all 12 criteria to current files and executed checks. Eleven criteria pass; AC-11 is
the explicitly rejected native-only branch. Server patches are selected under the frozen rule, and
0021/0022 are declined. The external and native prototypes remain private research fixtures. All
measured fixture hashes match; scores and sensitivity recompute; every browser profile passes. The
package and clean release reports prove no unselected runtime/API/dependency ships. Public, brain,
generated corpus, roadmap and conditional-ticket documentation agree with the decision.

Plan, Code and Test closures passed in order. Delivery run `2026-09-05T20-32-56-549Z-4971` passed
all 13 gates on one unchanged tree and issued its receipt. The final delivery command repeats the
gate after this documentation audit so the worktree receipt also covers the terminal ticket text. No
runtime implementation or public export was added by this decision, and no mutation testing was
used.

Historical status: Complete

### Completion audit

The shared fixture now wraps long text at the existing 640px viewport, 200% root font size and 2x
zoom. System and monospace font checks preserve content, the original width assertion, and axe
checks for every strategy. All 87 focused browser cases and 45 fresh measurement samples pass. The
recorded browser digest is `27912eadc8b567407698e0cb900f228010656f54f7bc512b01405885e8d51259`; the
raw measurement digest is `03b11a71ea16bce61e4aaef77555a7cd2cd0056630c1b52c4c5fe0b39f3906bf`.
Fixture digests match and score/sensitivity calculations remain unchanged at 91/92/90.

The corrected local delivery and Test validator passed before commit `e6a57ca`. Its package remains
byte-identical to the preceding artifact, so the private research correction adds no published
runtime surface. All twelve criteria have direct evidence or the explicit AC-11 native rejection.
The decision, current measurement tables, testing guidance and declined children agree. Ticket 0052
separately owns the hosted full-audit requirement and later property-test correction. A fresh
delivery must cover this closure text before committing it.

Status: Complete

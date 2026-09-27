# Asynchronous resource strategy

Ticket: [0020](../tickets/0020-prove-resource-strategy.md). Status: complete; server patches
selected and repository delivery verified.

## Frozen comparison contract

Contract `project-inspector/1` was recorded on 2026-09-05, before prototype implementation or
measurement. The baseline is persistence commit `e797dc9`. Changes to this contract require an
explicit dated amendment, a reason, and rerunning all three strategies. Results must not change the
rubric retroactively.

The Project Inspector is a focused extension of the existing Project Browser workflow: selecting a
versioned project drives a pinned summary and activity panel. It reuses the Browser's native table,
project identifier, server-validated edit, and version-conflict conventions. It does not repeat the
Browser's already-proven query/facet/group/virtualization features. The fixture is synthetic and
research-only. Its result applies to this coordinated inspector, not every possible server-state
application.

There are three independently owned jQStar applications: the table/coordinator boundary and nested
summary and activity roots. The outer boundary contains the two consumer roots because the existing
backend action deliberately limits HTML patches to its initiating application. Each consumer still
has a separate application identity and lifetime. All three strategies use that same topology.
Selection is one shared store containing a project ID. Server data never enters that store.

All strategies start with the same server-rendered project, native table links, labelled versioned
edit form, summary, activity, and polite live region. Each data panel has `data-jqs`, a stable
`data-part="content"`, `aria-busy`, and documented `data-state` values `ready`, `loading`, `error`,
or `empty`. A cold selection retains the previous content marked busy until the selected response
settles. An error retains that content with an explicit error and a Retry button. A warm selection
may settle without showing loading. Focus stays on the initiating link or button. A successful
update announces the selected project and version once; failure, conflict, and retry use the same
messages in every strategy. Empty activity uses readable text rather than an empty container.

The server owns project values, permissions, input validation, and the monotonic version. Reads use
one URL with `Accept` negotiation for JSON or official Datastar SDK events, the same data source,
`Vary: Accept`, private 60-second HTTP freshness, and representation-specific ETags. Each mutation
uses a native POST with a CSRF token and expected version; validation returns 422, permission denial
403, conflict 409, and a successful write advances the version. The browser requests fresh data
after a write. No variant may optimistically accept a canonical write.

Each test gets a fresh isolated server session. Initial projects are A, B, and C, with C having no
activity. Controlled read delay is 80 ms, slow A delay is 240 ms, and configured failures are
finite. The client freshness interval is also 60 seconds. Inactive client records expire after 250
ms for observable GC tests. HTTP caching remains available to every strategy. The server strategy
may coordinate one request and patch both consumers. Request counts distinguish fetch invocations,
origin requests, conditional responses, and aborts; a cached HTTP replay is not an origin request.

## Common scenario matrix

| ID  | Interaction                                  | Required observable result                                                                                        |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| S01 | Initial HTML and enhancement                 | Three distinct application identities; useful HTML before JS; no duplicate boot read.                             |
| S02 | Cold B selection with both consumers         | Both show B at one canonical version; measure dedupe, loading, latency, focus and announcement.                   |
| S03 | B → A → B within freshness                   | Correct retained content and version; record memory versus HTTP cache behavior and origin work.                   |
| S04 | Slow A → B before A resolves                 | B remains final after A's deadline; obsolete work is cancelled and cannot patch late.                             |
| S05 | Remove one consumer during a read            | The surviving consumer completes; its request is not cancelled by the other root.                                 |
| S06 | Remove every consumer during a read          | Outstanding work aborts; no late DOM writes; inactive cache/timers expire.                                        |
| S07 | Save a valid edit                            | Server version advances; both consumers refresh to canonical data; no optimistic write authority.                 |
| S08 | Submit stale, invalid, and forbidden edits   | 409/422/403 remain server decisions; readable errors; focus and entered values survive.                           |
| S09 | Read failure then Retry                      | Error is accessible, retry succeeds, and failed state does not permanently poison revisits.                       |
| S10 | Select C                                     | Both agree on C and its version; activity explains the empty result.                                              |
| S11 | Preserve a consumer during external render   | Public render adapter keeps the exact app/node and focus; removed root releases its work.                         |
| S12 | Native navigation, reload, Back, JS disabled | Complete documents and native forms remain useful; no native router or cache is required.                         |
| S13 | Kernel disposal while work is pending        | Idempotent public disposal, zero failures/remaining owners, aborted work, zero cache/timer/task/observer residue. |
| S14 | Switch identity or tenant                    | Dispose before switching; fresh installation cannot read the previous identity's client data.                     |
| S15 | Responsive and accessible output             | Keyboard, axe, mobile, reduced motion, forced colors, zoom/reflow and no-JS share the same expectations.          |

Browser measurements use Chromium, Firefox, and WebKit, one worker, and five fresh repetitions of
cold/warm selection per browser/strategy. Report all samples, median and p95 by browser; do not pool
engines. DOM semantic assertions run independently of latency thresholds. Latency is descriptive and
only the small warm-response rubric item uses a threshold. Record OS, Node, browser versions,
bundler version, contract/source digests, and server counters with each result.

## Rubric frozen before results

Each category receives 0–5 and contributes `weight * score / 5`. The weights sum to 100.
Correctness, server write authority, no-JS usefulness, equivalent accessible output, and complete
ownership cleanup are hard gates. Any unresolved failure disqualifies a strategy. Repairing a
prototype requires replaying the complete common matrix, without relaxing its assertions.

| Category                              | Weight | Scoring rule                                                                                                                                                                      |
| ------------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User benefit/correctness              |     25 | Three points for the complete semantic matrix, one for one cold origin read across concurrent consumers, one for a warm median at most 25 ms in every engine.                     |
| Server/HTML authority                 |     20 | Two points for initial/no-JS equivalence, two for validation/permission/conflict/write authority, one when no browser project-data model duplicates the server view model.        |
| Lifecycle                             |     15 | One each for correct one-consumer removal, all-consumer cancellation, terminal disposal, identity separation, and bounded inactive retention.                                     |
| Shipped cost                          |     10 | Incremental minified gzip over the identical core/stores/common shell: at most 5/15/30/60 KiB gives 5/4/3/2; larger gives 1. Include every strategy-only dependency and template. |
| Implementation/testing complexity     |     10 | Owned strategy-only nonblank, noncomment runtime/type lines: at most 100/200/400/800 gives 5/4/3/2; larger gives 1. Also report shared, server, tests and docs separately.        |
| Maintenance/security                  |     10 | Estimated annual owned work at most 24/48/96/192 hours gives 5/4/3/2; larger gives 1. Formula below; unresolved exact-package advisory disqualifies.                              |
| Interoperability/upgrade              |      5 | One each for public APIs only, per-kernel isolation, preserved rendering, no global environment-manager changes, and no framework adapter dependency.                             |
| Accessibility/progressive enhancement |      5 | One each for native links/forms, stable focus, common announcements/errors/empty output, no-JS operation, and passing responsive/accessibility checks.                            |

Annual work estimate: 8 hours for four two-hour ownership reviews, plus 4 hours per started 100
owned strategy runtime/type lines, plus 2 hours per distinct strategy API concept, plus 4 hours per
external package for upgrade/advisory review, plus 2 hours per strategy-owned async state
transition. These are planning assumptions, not measured labor. Report the inputs and a ±50%
uncertainty range. Existing jQStar/common-fixture costs are reported separately and common to all
alternatives.

Sensitivity analysis varies each category weight independently by factors 0.5, 1, and 1.5,
renormalizes to 100, and also varies each maintenance estimate through its uncertainty range. Report
win counts and ties. A score difference below two points is inconclusive and favors the existing
server composition unless a hard workflow requirement rules it out.

Native approval additionally requires a concrete material workflow gap in server coordination,
evidence that the thin external adapter cannot close it at acceptable cost, and a native advantage
that survives sensitivity analysis. A warm-cache speedup by itself cannot establish all three. The
result may keep server patches, recommend a separately owned external integration, or activate
ticket 0021 with frozen contracts. Mutation ticket 0022 remains a separate conditional decision.

## Isolation and reproducibility

Prototype files live under `test/fixtures/resource-strategy/`, with separate entry graphs. They may
share the contract, server, HTML renderer, interaction driver, measurement plumbing and public
jQStar APIs, but cannot import another strategy implementation. No production entry, registry block,
site bundle or packed artifact may import these files or the research dependency.

The external dependency belongs to an exact locked private fixture package under `external/`. An
explicit preparation command installs that fixture with scripts disabled. This keeps the root
package and its lockfile free of an unselected dependency while retaining repeatable evidence after
a server/no-package decision. The fixture is never published, and its dependency is never installed
in a package consumer. This refines the ticket's initial temporary root-alias installation plan.

External candidate: `@tanstack/query-core@5.102.8`, MIT, no runtime dependencies according to the
registry metadata retrieved on 2026-09-05. Exact tarball integrity is recorded in the evidence data
and fixture lockfile. The adapter will use public `QueryClient`, `QueryObserver`, invalidation,
observer teardown and client clearing, and explicitly pass the loader's abort signal to fetch. The
[observer reference](https://tanstack.com/query/latest/docs/reference/QueryObserver) and
[client reference](https://tanstack.com/query/latest/docs/reference/QueryClient) describe those
APIs. Execution-time inspection of the exact installed source remains required.

## Results and decision

Keep coordinated server HTML/Datastar patches as the supported path for this workflow. Publish no
resource package and no official query-client adapter. Conditional resource ticket 0021 and mutation
ticket 0022 are declined. The full delivery run verified package exclusion and all browser profiles.

The external prototype scores 92/100, server patches 91, and native 90. The one-point external lead
falls inside the predeclared two-point inconclusive range, which favors the existing composition.
All three implementations pass the common behavior and ownership scenarios. The result preserves
current server-rendered application structure and avoids adding a second official server-data
lifecycle to jQStar.

Both caches improve WebKit revisits. The thin external adapter already supplies that improvement
with public APIs and moderate shipped cost, so the experiment does not meet the additional native
approval conditions. Native's small executable footprint alone does not justify a stable cache API.
The external prototype remains a useful reference for a future application requirement, with a new
implementation ticket required before an official adapter could ship.

### Observed behavior and latency

The repository [evidence dataset](../../quality/resource-strategy.json) contains all 45 samples,
complete disposal reports, module graphs, source fingerprints, package provenance and scoring
inputs. Each cell below is median / p95 milliseconds over five fresh contexts, with an 80 ms origin
read delay. The browser versions and exact environment accompany the raw samples. Current
measurements were repeated on official Node 24.20.0 at `2026-09-06T12:27:37.698Z` after the shared
reflow correction.

| Browser  | Server cold | External cold | Native cold | Server warm | External warm | Native warm |
| -------- | ----------: | ------------: | ----------: | ----------: | ------------: | ----------: |
| Chromium |   89 / 90.8 |     85.8 / 86 | 85.1 / 85.4 |   2.3 / 2.5 |     0.6 / 0.7 |   0.6 / 0.6 |
| Firefox  |     90 / 96 |       88 / 88 |     88 / 90 |       4 / 5 |         2 / 2 |       1 / 1 |
| WebKit   |     90 / 91 |       86 / 86 |     86 / 86 |     90 / 91 |         1 / 1 |       1 / 1 |

Every cold concurrent selection makes one origin read. Server warm revisits make zero origin reads
in Chromium and Firefox and one in WebKit. Client-cache warm revisits make zero in all three
engines. This is an observed difference in the tested HTTP/SSE path; it does not establish a
universal WebKit cache policy. Cache freshness and the origin delay are controlled experimental
inputs, so these numbers describe this fixture rather than production latency.

The common browser driver covers canonical edits, 409/422/403 responses, read error/retry, empty
activity, per-consumer removal, final-consumer abort, native navigation, identity changes and public
render preservation. The disposal cases inspect public reports and actual browser timer counts. The
strengthened rapid-selection case crosses the inactive-cache boundary and observes B after obsolete
A's original deadline. Keyboard checks preserve focus inside the moved summary root. Mobile,
reduced-motion, forced-color, zoom/reflow and JavaScript-disabled flows use the same markup. The
final focused matrix passed all 87 executions after strengthening the scenarios. The dataset retains
every redacted observation and all nine terminal disposal reports. Delivery run
`2026-09-05T20-32-56-549Z-4971` passed all 448 repository browser executions, all 1034 unit tests,
package/release checks and every other required gate.

### Cost and owned work

| Measurement                       | Server | External | Native |
| --------------------------------- | -----: | -------: | -----: |
| Incremental minified gzip bytes   |  10414 |     9098 |    468 |
| Owned strategy runtime/type lines |     82 |       67 |    115 |
| Strategy integration concepts     |      5 |       11 |      7 |
| Owned async transitions           |      6 |        5 |     10 |
| Additional external packages      |      0 |        1 |      0 |
| Estimated annual hours            |     34 |       48 |     50 |
| Estimate uncertainty range        |  17–51 |    24–72 |  25–75 |

Line counts exclude blank and comment-only lines and include each strategy's entry. The shared
shell, HTML renderer, server, types, CSS, test driver, test suites, tools and documents are
inventoried separately in the dataset. The external dependency contributes 297025 packed bytes,
2254567 unpacked bytes, and 365 files. Its package has no runtime, optional or peer dependencies.
These package bytes are development/install costs, not browser transfer sizes.

The baseline exports the identical common shell, core and stores. The server increment includes the
Datastar profile; the existing full Project Browser already uses that profile. Its actual added cost
in that host can therefore be lower than this isolated-slice comparison. Every prototype also
carries the identical seed and renderer plumbing for parity. Shared bundle compression means
incremental gzip is a whole-bundle difference, not a separately downloadable native chunk.

Annual hours follow the frozen formula. The concept and transition lists are explicit inspection
inputs, not measured labor. Query Core owns its internal transitions; the external adapter owns its
mapping and integration. The jQStar release owner should review ownership, package releases and
advisories quarterly and rerun this comparison before changing the supported strategy.

### Score calculation and sensitivity

| Category                              | Weight | Server contribution | External contribution | Native contribution |
| ------------------------------------- | -----: | ------------------: | --------------------: | ------------------: |
| Benefit/correctness                   |     25 |                  20 |                    25 |                  25 |
| Server/HTML authority                 |     20 |                  20 |                    16 |                  16 |
| Lifecycle                             |     15 |                  15 |                    15 |                  15 |
| Shipped cost                          |     10 |                   8 |                     8 |                  10 |
| Implementation/testing complexity     |     10 |                  10 |                    10 |                   8 |
| Maintenance/security                  |     10 |                   8 |                     8 |                   6 |
| Interoperability/upgrade              |      5 |                   5 |                     5 |                   5 |
| Accessibility/progressive enhancement |      5 |                   5 |                     5 |                   5 |
| Total                                 |    100 |                  91 |                    92 |                  90 |

The server loses the warm-response point because WebKit exceeds 25 ms. The client strategies lose
the authority point for retaining subsequent project response models and invoking a browser read
renderer. The shared initial seed is common experimental infrastructure. The other differences come
from the frozen byte, owned-line and annual-work bands. Hard-gate evidence is retained separately
from scores and cannot be overridden by a large numerical total.

All 177147 combinations of category weights and maintenance estimates were evaluated. Strict score
wins are server 58509, external 74439, native 23679, with 20520 exact ties. The existing server
composition is within two points of the best score in 99917 combinations. Applying the failed native
approval conditions and the two-point existing-composition rule gives server 107508 and external
69639 choices. These counts describe the sensitivity grid, not probabilities.

Reasonable assumptions change the ranking. The decision therefore follows the predeclared treatment
of an inconclusive nominal difference and the current server-rendered product boundary. A product
requirement for consistently immediate repeated reads would strengthen the case for an external
adapter. The experiment supplies no evidence that that adapter is materially unsuitable, and native
does not show a stable advantage across assumptions.

### Authority, coupling and review findings

The outer coordinator keeps one shared read alive while either consumer needs it. Each consumer owns
its subscription. Removing the final consumer aborts the request; kernel disposal releases the
strategy service and all application hooks. Public render transactions preserve the exact selected
root and its focus. The same ownership pattern wraps Query Core observers or native leases.

Server responses own both HTML regions and their stable IDs. Adding a panel requires updating that
server template and its common interaction contract. JSON strategies add a browser project model and
renderer, while allowing a query core to own deduplication, cancellation and cache retention. The
fixture shares renderer source to prevent template differences from biasing behavior. The server
continues to own permission checks, CSRF, validation, versions and accepted writes in every variant.
Conflict responses preserve the draft and require an authoritative reload before another save.

Identity or tenant changes dispose the previous kernel before loading a new document. The cache is
scoped to that kernel and never carries authorization decisions. Native links and forms remain the
complete fallback. Browser caches do not accept writes, queue them offline or infer that an aborted
write was rolled back.

A separate inspection pass in the same author session found three concrete ownership concerns: setup
allocations needed immediate rollback cleanup, native retained leases needed a terminal guard, and
the external adapter's redundant invalidation-key set needed removal in favor of Query Core's own
state. Direct regressions cover those findings. This was a same-session review; a second-person
review would add evidence about experimental bias and the subjective maintenance assumptions.

### External package provenance and limits

The exact package was published on 2026-08-27 and retrieved on 2026-09-05. Its tarball SHA-512
matches both registry metadata and the private fixture lockfile. The dated npm audit reports zero
known vulnerabilities for that fixture. See the
[registry record](https://registry.npmjs.org/@tanstack%2fquery-core/5.102.8) and
[official releases](https://github.com/TanStack/query/releases).

The [repository advisory index](https://github.com/TanStack/query/security) showed no security
policy file and an advisory for a different package. The official
[May 2026 postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) says Query
was unaffected, while an older timeline entry on that page mentions query-core. The dataset retains
that source inconsistency. The decision relies on the exact verified August package and dated audit,
without claiming that database results prove the absence of vulnerabilities.

The family installation documentation lists modern browser targets. Those are recorded as family
guidance, not an independently guaranteed minimum-version matrix for this core build. The experiment
proves the actual recorded Chromium, Firefox and WebKit versions. The adapter uses the public core
without React or another framework adapter, without mounting global focus/reconnect managers, and
without changing a global timeout provider.

### Supported composition and revisit triggers

Put application orchestration in a registry block. Give its coordinator an outer `data-jqs`
boundary, keep consumer application roots independent inside it, and share only selection through a
store. One named backend action should request canonical output and let the official Datastar SDK
patch the stable content targets. Retain the request while a consumer needs it, cancel obsolete
reads, and remove every subscription through application or kernel ownership. Preserve native links
and forms.

HTTP caching can reduce repeated origin work, but correctness must hold when a browser contacts the
origin again. Explicitly refresh canonical output after a successful write. Keep permission,
validation and version decisions on the server. Use the existing render adapter when another host
moves or removes roots.

Revisit this decision when a measured product requirement needs immediate repeated reads across
engines, coordinated patches become materially difficult for independent regions, a separate JSON
consumer must share a cache, or observed latency/payload/traffic exceeds an agreed application
budget. Compare an application-owned external core adapter first. A new official adapter needs its
own ticket; a native client still needs evidence that the external route is unsuitable.

### Reproduction

Run from the repository root with the normal development dependencies and Playwright browsers:

```sh
npm run research:resources:prepare
npx vitest run test/resource-strategy.test.ts test/resource-strategy-server.test.mjs test/resource-strategy-contract.test.mjs
JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY=.git/jqstar/resource-strategy/browser npx playwright test e2e/resource-strategy.spec.ts
npm run research:resources:record-browser -- --report .git/jqstar/resource-strategy/browser/results.json --record
npm run research:resources:measure -- --record
npm run research:resources:score -- --record
npm run check
```

Preparation installs only the exact private fixture if needed, with install scripts disabled. Every
canonical quality mode runs its `--install-only` step before unit/static checks. Browser recording
requires all 87 executions to pass without retries or skips. The measurement command saves immutable
raw output below `.git/jqstar/resource-strategy/measurements/` and records it in the evidence
dataset only with `--record`. Scoring recomputes arithmetic and sensitivity from explicit inspection
inputs; it does not choose or change the decision. Review changed measurements and source
fingerprints before updating a completed decision ticket.

### Shared reflow correction, 2026-09-06

The Linux hosted audit exposed a shared heading overflow at the existing enlarged-text and zoom
settings. Wider font metrics could push an unbroken word beyond the page. Ticket 0020 adds inherited
text wrapping and checks both system and wider fallback fonts in S15 for every strategy, retaining
the original zoom, full-content, native-table-scroll, and accessibility requirements. The shared
stylesheet correction does not change request behavior or the server-patch decision. The repeated
87-case browser matrix passes without failures, retries or skips; the fresh 45-sample dataset
records the current source and official Node 24 compression output. Incremental gzip sizes are
10,414 / 9,098 / 468 bytes for server / external / native. Scores remain 91 / 92 / 90 and the entire
177,147-case sensitivity result is unchanged. Original raw research remains in its dated directories
and Git history. Ticket 0052 still requires a passing hosted full audit.

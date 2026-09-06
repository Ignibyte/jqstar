# Program audit evidence

Ticket [0033](tickets/0033-audit-full-library-program.md) is in progress. No complete program-audit
verdict exists yet. The declarative computed correction (0034) and quality review (0052) are
complete. Ticket 0045 now closes the restored README priorities and direct narrow-home browser
observations. Ticket 0035 passes the expanded installed CSP accessibility/native proof, canonical
HTML and detector checks, and the actual manual-server command smoke. Real screen-reader records
remain required. The 0039 public-guide correction passes automated verification, but its actual
screen-reader observations are still missing. Ticket 0051's candidate-copy correction is complete.
Ticket 0044 completed the correction that prevents killed or timed-out detector processes from
counting as success. Ticket 0043 completed the semantic census correction: full delivery passes with
116 runtime coverage files, unchanged thresholds and no artificial coverage credit for type-only
modules. Ticket 0017 is reopened because its documented GitHub private-reporting route is disabled;
the repository-setting change awaits separate authorization. Ticket 0053 remains a deferred mutation
audit that requires later execution authorization.

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
executor below now supplies its own frozen inputs and supervised parent interval. Binding that
component index into the complete program manifest and acceptance matrix remains required.

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

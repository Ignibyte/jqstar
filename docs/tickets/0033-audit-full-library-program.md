---
id: 0033
title: Audit the full library program
status: coding
created: 2026-08-30
updated: 2026-09-06
---

# 0033: Audit the full library program

## Plan

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

## Code

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

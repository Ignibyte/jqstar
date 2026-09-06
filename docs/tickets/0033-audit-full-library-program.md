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

## Code

### Changed-file ledger

| File                                                           | Purpose                                                                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/program-audit/requirements.mjs`                       | Derive every declared ticket/program criterion, enforce the expected roster, and validate exact evidence mappings.                                                |
| `scripts/program-audit/contracts.mjs`                          | Shared bounded fields, closed objects, safe relative paths, timestamps, and digest validation.                                                                    |
| `scripts/program-audit/manual-evidence.mjs`                    | Check exact candidate/receipt and frozen environment identities, complete charter steps, and per-step Quick Nav settings with fixed diagnostics.                  |
| `scripts/program-audit/evidence.mjs`                           | Resolve named unit/browser/property/static/package/source proof; reject wrong identities, missing/duplicate results, skips, retries, and insufficient executions. |
| `scripts/program-audit/files.mjs`                              | Bounded regular UTF-8 reads, digest checks, symbolic-link refusal, deterministic exclusive snapshots, and bounded output cleanup.                                 |
| `scripts/program-audit/claims.mjs`                             | Extract authored Markdown and HTML claim candidates before evidence selection; preserve code examples and duplicate occurrences.                                  |
| `scripts/program-audit/inventory.mjs`                          | Produce a schema-valid review inventory outside the artifact, with complete source inputs and an explicit unresolved-work list.                                   |
| `scripts/program-audit/reports.mjs`                            | Validate frozen report/schema identities and bounded JSON, then return immutable data for named execution checks.                                                 |
| `scripts/program-audit/release.mjs`                            | Require complete release checks for the frozen artifact, independent builds, historical comparison, toolchain and supporting evidence.                            |
| `scripts/program-audit/navigation.mjs`                         | Validate the full raw navigation matrix, exact configured assertions and identity, explicit exclusions, and terminal cleanup.                                     |
| `test/program-audit-navigation.test.mjs`                       | Keep historical full-report compatibility and negative controls for identity, completeness, assertions, cleanup and stronger evidence requirements.               |
| `test/program-audit-release.test.mjs`                          | Reject incomplete, stale, inconsistent or weaker release evidence; bind synthetic report and mapping controls to the maintained schemas.                          |
| `quality/program-audit/{vitest,playwright}-report.schema.json` | Validate the upstream report fields consumed by the adapters without treating a valid schema as a passing test run.                                               |
| `test/program-audit-reports.test.mjs`                          | Exercise digest/size/schema mismatch, unsafe files, private error handling, structural limits, immutable results, and unsuccessful executions.                    |
| `quality/program-audit/inputs.json` and internal schemas       | Fix the 53-ticket roster, 613 requirement count, 74 claim source files, 22 baseline inputs, and closed inventory/mapping structures.                              |
| `test/program-audit*.test.mjs`                                 | Exercise incomplete/ambiguous/stale/weaker evidence, identity mismatch, file boundaries, immutable output, and actual repository inventory.                       |
| `test/property/program-audit.property.test.mjs`                | Generated roster/order/wrapping and duplicate claim occurrence controls using the existing property runner.                                                       |
| `docs/PROGRAM_AUDIT.md` and `docs/README.md`                   | Explain the internal commands, evidence boundaries, and remaining integration/manual review work.                                                                 |
| This ticket                                                    | Keep the baseline, design, changed files, verification results, and unresolved acceptance work current.                                                           |

The mapping validator and `quality/program-audit/mappings.schema.json` now distinguish release
evidence from installed-package evidence. `docs/PROGRAM_AUDIT.md` records that distinction and the
remaining parent-gate interval integration.

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

Planning mappings now cover 434 requirements with 3,796 exact citations. Fourteen additional CSP
implementation rows pass their schema and selector compatibility probes. The remaining 179
requirements, all claim review and final execution/manual evidence remain required.

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

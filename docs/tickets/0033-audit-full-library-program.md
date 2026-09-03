---
id: 0033
title: Audit the full library program
status: planned
created: 2026-08-30
updated: 2026-09-01
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
- Tickets 0001–0049 are the decision/change records. Resource, navigation, and DevTools tracks may
  legitimately finish done or declined, but not remain planned/coding/testing/documenting/blocked.
- Ticket 0017 audits the stable 1.0 artifact. Tickets 0018–0032 add later optional services and
  upgrade tooling; this ticket audits the whole program rather than weakening the 1.0 boundary.
- Tickets 0038–0040 own ecosystem stewardship and migration. Tickets 0046 and 0049 own the jQStar
  website, reference match, and final public naming record.
- Tickets 0041–0044 define fail-closed static, coverage/property, browser, package, reproducibility,
  and release evidence. Ticket 0048 explicitly removed mutation testing from the required workflow.
- Ticket reports and receipts bind quality to an exact tree, but documentation links, compatibility
  claims, declined-surface absence, and requirement traceability still require a separate audit.

### Activation gate

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
  0030–0032, 0034–0049. Ticket 0031 must be done or declined.
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

### Security and accessibility

- Audit artifacts can contain paths, logs, URLs, environment data, and fixture secrets. Schemas
  allowlist fields, redact local paths/secrets, cap logs, and keep intentional canaries synthetic.
  Reports include no credentials, tokens, cookies, private HTML, or user data.
- Build/test consumers have network and write canaries appropriate to their contract and use owned
  bounded temp roots. No audit command executes untrusted downloaded project code outside the exact
  locked dependency/install contract.
- Accessibility claims require semantic/browser evidence; visual snapshots or axe alone cannot prove
  keyboard, focus, announcements, reduced motion, zoom, and no-JavaScript behavior.

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

### Planned files

- Program-audit generator, evidence adapters, schemas, immutable manifest/report types, and bounded
  owned-temp orchestration.
- Requirement/ticket/criterion/declined-alternative matrices and exact-artifact consumer manifests.
- Audit fixtures for identity mismatch, stale/missing/indirect evidence, graph absence, redaction,
  cleanup, and deterministic reporting.
- Final public/project documentation corrections and ticket evidence only after owning behavior
  already matches.
- This ticket's changed-file, command, report, and criterion evidence ledgers.

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

Pending implementation.

### Completion audit

Pending.

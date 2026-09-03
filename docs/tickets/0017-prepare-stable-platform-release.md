---
id: 0017
title: Prepare the stable 1.0 platform release
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0017: Prepare the stable 1.0 platform release

## Plan

### Problem

A collection of passing feature tickets does not prove a stable release. The repository lacks a
single candidate-bound audit proving that the package, public website, policies, migrations,
security claims, and every supported consumer all describe the same 1.0 product. Stable release
preparation also needs an authorization boundary: proving an artifact must not silently create a tag
or publish it to npm.

### Current evidence

- The current package is `0.1.0`; ticket 0013 plans to remove the duplicated runtime version and
  derive all modular artifacts from `package.json` before preview publication.
- Tickets 0003, 0004, and 0041–0044 established a public baseline, real tarball consumers, quality
  receipts, browser/accessibility proof, API/type review, package contents, size budgets, and
  release reproducibility. Tickets 0041–0044 remain blocked until their committed hosted GitHub
  evidence is authorized and inspected.
- Ticket 0048 removed mutation tooling, commands, dependencies, reports, schemas, and release gates.
  No 1.0 criterion may reintroduce mutation testing unless a future explicit ticket requests it.
- Tickets 0013–0016 and 0034–0037 plan modular/CSP/testing/interoperability surfaces. Their preview
  labels, exact package graphs, installed consumers, and stable-API decisions are prerequisites, not
  evidence that already exists.
- Tickets 0038–0040 own jQuery ecosystem stewardship plus jQuery UI/Mobile coexistence and
  migration. Archived UI/Mobile runtimes must not enter jQStar's artifact.
- Tickets 0045, 0046, and 0049 establish the jQStar name, server-rendered product promise, and
  self-hosted reference-matched website. Public release copy must use jQStar consistently while npm
  remains `jquery-star`, the CLI/repository remains `jqstar`, and `data-jqs` remains markup.
- `scripts/quality-release.mjs` and package quality now clean owned temporary workspaces on success,
  failure, and signals after ticket 0048 repaired a roughly 55 GB leak. The stable gate must prove
  cleanup again under every exit class.
- No tag, npm publication, provenance attestation, or GitHub release is authorized by this ticket.

### Scope

- Freeze the 1.0 public surface and publish compatibility, browser, Node, jQuery, document topology,
  module-format, plugin API, CSP, interoperability, deprecation, migration, security, support, and
  release policies consistent with executable evidence.
- Create one upgrade guide from 0.1 through each published preview to 1.0, including root versus
  modular installation, default protocol behavior, disposal, plugin registries, testing, CSP
  language differences, Turbo/htmx bridges, naming, and all deprecations or explicit no-change
  statements.
- Publish the evidence-backed jQuery ecosystem policy plus tested jQuery UI and jQuery Mobile
  coexistence/migration paths. Keep both archived runtimes and any fork/official-successor claim out
  of the release artifact unless ticket 0038 explicitly approves otherwise.
- Produce a complete changelog/release-notes process with user-visible changes, breaking-change and
  migration links, security acknowledgments, known limitations, and contributor/tool attribution.
- Set the candidate version once in `package.json`/lockfile and prove the package, CLI, every
  runtime facade, declaration, source map, browser global, website, registry metadata, archive, and
  report derive the exact same value. Keep plugin API and grammar/contract versions explicitly
  independent.
- Require a clean, committed, non-shallow source checkout with no submodule drift, untracked shipped
  files, ignored production inputs, or pre-existing release tag. Record commit, tree, Node/npm/tool
  versions, lockfile integrity, environment allowlist, and source-date input before building.
- Build two independent candidate tarballs from fresh checkouts using locked dependencies. Compare
  byte checksum, npm integrity, normalized file manifest/modes, declarations, maps, license notices,
  generated website archive, and executable behavior; clean every owned temporary checkout on all
  exit paths.
- Install the exact tarball—not workspace source—into every root/modular/CSP/testing/Turbo/htmx,
  TypeScript, QUnit, no-build/UMD, CLI/registry, self-hosting, and browser consumer and run the full
  supported matrix.
- Generate one immutable release-candidate report/receipt bound to the exact git tree, tarball,
  dependency lock, quality reports, consumer reports, public API baseline, documentation audit, and
  artifact checksum. Fail closed on missing, stale, skipped-required, malformed, or mismatched
  evidence.
- Audit every acceptance criterion and completion/disposition in tickets 0001–0016 and 0034–0049.
  Superseded work must link its replacing decision; blocked/planned/coding/testing/documenting work
  cannot be waived into 1.0.
- Prove optional post-1.0 stores, persistence, resources, native navigation, inspection, DevTools,
  and upgrade tooling are absent from stable exports/bundles and do not block the platform release.
- Prepare exact, read-only tag/npm/GitHub release commands, expected digests, post-publication
  verification, and rollback/deprecation response. Execute none of them without separate explicit
  user authorization.

### Out of scope

- Stores, persistence, resources, native navigation, or DevTools UI.
- Publishing to npm without explicit release authorization.
- Creating/pushing a git tag, GitHub release, provenance statement, registry dist-tag, announcement,
  or signing operation without explicit release authorization.
- Raising quality thresholds, package size budgets, supported version ranges, or security claims
  merely to make the candidate pass.
- Reintroducing mutation testing or treating it as 1.0 evidence.

### Dependencies

- Tickets 0001 through 0016 and 0034 through 0049. Ticket 0048 supersedes ticket 0047's mutation
  branch; both dispositions remain part of the audit trail.

### Acceptance criteria

- [ ] [AC-01] Compatibility, environment/document, plugin, expression/CSP, testing,
      interoperability, deprecation, migration, security, support, and release policies are public,
      mutually consistent, versioned where required, and linked to executable 1.0 evidence. No
      preview, roadmap, or planned wording remains on a stable exported surface.
- [ ] [AC-02] The 0.1-to-1.0 upgrade guide covers every public addition, behavior/default change,
      deprecation/removal, package subpath, naming convention, CSP incompatibility/migration,
      bridge, and jQuery UI/Mobile path. Each breaking or intentionally unchanged baseline item maps
      to a test and changelog entry.
- [ ] [AC-03] `package.json` is the one package-version source. Package/lockfile, root/core/UI/
      Datastar/CSP/testing/Turbo/htmx facades, ESM/CommonJS/UMD artifacts, declarations, source
      maps, CLI/registry output, website/archive metadata, reports, and release notes all report the
      exact candidate version; plugin API and CSP/bridge contract versions remain explicitly
      separate.
- [ ] [AC-04] Candidate preparation refuses a dirty, uncommitted, shallow, mismatched-lockfile,
      wrong-branch, ignored-production-input, existing-tag, or unsupported-tool environment before
      creating an artifact. It records the exact commit/tree, source-date, Node/npm/tool versions,
      relevant environment allowlist, and dependency integrity without leaking credentials.
- [ ] [AC-05] Two fresh locked-dependency checkouts produce byte-identical npm tarballs with the
      same SHA-256/SHA-512, npm integrity, normalized path/mode/size manifest, generated
      declarations/maps, license/notice inventory, website archive, and package metadata. Every
      owned temporary checkout is removed after pass, failure, timeout, interrupt, and termination
      self-tests.
- [ ] [AC-06] The exact tarball passes Node ESM/CommonJS, TypeScript NodeNext/Bundler, browser
      modules, root UMD/CDN/no-build, QUnit, CLI/registry, self-hosting, package-content, private
      deep-import refusal, source-map/declaration/API, `publint`, Are the Types Wrong, and
      license/dependency checks with no workspace/source alias or hoisted undeclared dependency.
- [ ] [AC-07] Executed bundle/module-graph/sentinel/size checks prove root is exactly composed
      core + Datastar + UI; core/UI/Datastar/CSP/testing/Turbo/htmx consumers include only requested
      capabilities; and stores, persistence, resources, native navigation, inspection, DevTools,
      upgrade tooling, fixtures, server, registry, and website code are absent from runtime graphs.
- [ ] [AC-08] Root behavior, exports, jQuery augmentation, import side effects, directives/actions,
      UI identities, request bytes/default Datastar profile, events, errors, patching, and lifecycle
      remain compatible with every stable 0.1 baseline item or follow its completed deprecation and
      documented migration. No baseline or assertion is edited during candidate testing.
- [ ] [AC-09] Installed core/UI/Datastar/testing/external-plugin conformance passes; the CSP entry
      passes its approved grammar/threat corpus under real policies without `unsafe-eval` or trusted
      compiler code; Turbo and htmx pass exact supported-version, preservation, cancel/error,
      history, form/focus, and three-browser coexistence matrices.
- [ ] [AC-10] The package contains no jQuery UI or jQuery Mobile runtime/source/style/assets and
      makes no unapproved official-successor claim. jQuery UI coexistence and component migration
      plus the no-runtime jQuery Mobile migration guide match installed/browser fixtures; jQuery
      Core peer, Sizzle, QUnit, and Migrate stewardship decisions match ticket 0038.
- [ ] [AC-11] The public jQStar website and packaged self-hosted archive use jQStar itself, match
      the approved reference/ticket 0049, expose current
      API/compatibility/migration/security/download copy, use `jquery-star`/`jqstar`/`data-jqs`
      correctly, and do not claim unpublished npm/tag/ domain state.
- [ ] [AC-12] One candidate-bound full-audit report enforces workflow/static/architecture/security/
      dependency/source/style/schema/docs, coverage/property, three-browser/accessibility,
      package/API/type/size/tree-shaking, release reproducibility, temp-cleanup, and
      detector-liveness gates with no hidden baseline, required skip, timeout, weakened threshold,
      or mutation testing.
- [ ] [AC-13] Security release checks cover dependency advisories and lock integrity, secret and
      generated-artifact scans, package scripts/exports/files, licenses/notices, CSP claims, server
      demo boundaries, and documented vulnerability reporting. Findings are fixed, explicitly
      accepted through policy, or block the candidate; credentials and private paths are redacted.
- [ ] [AC-14] Every criterion in tickets 0001–0016 and 0034–0049 has current Pass or valid terminal
      Approved-Disposition evidence, and every prerequisite ticket is `done` or `declined`. Ticket
      0048's removal decision supersedes mutation work; no blocked, planned, active, stale,
      duplicate, or unmapped 1.0 requirement remains.
- [ ] [AC-15] The handoff records the exact candidate commit/tree, tarball
      filename/digests/integrity, immutable report/receipt locations, release notes, expected tag,
      npm dist-tag, read-only verification commands, rollback/deprecation response, and separately
      approval-gated write commands. Preparing or completing this ticket does not tag, publish,
      push, announce, or sign.
- [ ] [AC-16] Final `npm run quality:full-audit`, `npm run check`, clean installed-candidate matrix,
      ticket Test/Document validation, and `git diff --check` pass against the unchanged closure
      tree without mutation testing. No documentation, test, generated, or package change follows
      the final candidate fingerprint.

### Design

Treat the committed source tree and its packed artifact as a pair. A candidate identity is
`{version, commit, tree, lockfile hash, tarball SHA-512/npm integrity}`; a report for any other
tuple cannot authorize release. Build scripts copy from a fresh checkout and may write only to an
owned temporary root plus `.git/jqstar/releases/<version>/<run-id>/`. They register cleanup before
the first copy/install and verify removal with failure/signal self-tests.

Candidate preparation has three non-publishing stages:

1. `prepare` validates prerequisites and source state, derives the version, builds/normalizes two
   independent artifacts, and compares them.
2. `prove` installs the exact first tarball into every consumer and runs all quality/browser/
   security/documentation matrices without modifying the source tree.
3. `handoff` writes an immutable out-of-tree manifest/receipt and prints exact read-only
   verification plus separately labeled approval-gated tag/publish commands.

The committed ticket and release documentation are finalized before the last run. The final report
is an out-of-tree attestation bound to that unchanged closure tree, avoiding a
report-hash/report-file cycle. Ticket validation reads the immutable report directly. A hosted CI
artifact for the same commit/tree is required where tickets 0041–0044 require hosted evidence.

`quality/release-contract.json` is the hand-authored stable surface and required-gate index; it does
not contain run-specific evidence. `schema/release-candidate.schema.json` validates the generated
report. The report references immutable subordinate receipts by hash and rejects missing or stale
results rather than copying summaries that could diverge.

Versioning uses `1.0.0` only after all preview surfaces have completed stability review. No script
invokes `npm version`, creates a tag, changes a dist-tag, or publishes. The expected tag is recorded
as `v1.0.0`; release authorization is a separate user decision after the candidate has passed.

### Decisions

- jQStar is the product name; `jquery-star` remains the npm package, `jqstar` the CLI/repository,
  and `data-jqs` the markup convention. The local `jqdatastar` directory is not release metadata.
- 1.0 stabilizes the platform: root, core, UI, Datastar, CSP, testing, Turbo, and htmx. Later
  stores, persistence, resources, native navigation, inspection, DevTools, and upgrade diagnostics
  remain optional post-1.0 work.
- Release evidence comes from the packed artifact and clean committed source pair, never a dirty
  working tree or source-adjacent import.
- Reproducibility means byte-identical tarballs and matching normalized contents from two fresh
  locked installs, not merely equivalent behavior.
- Mutation testing is deliberately absent under ticket 0048 and is not a stable-release gate.
- Completing this ticket means “audited and ready for authorized publication,” not “published.”
- Tagging, signing, npm/GitHub writes, announcements, and domain operations always require separate
  explicit authorization and verification of the result.

### Security and accessibility

- Release reports redact environment values, credentials, absolute private paths, response data, and
  source contents not already public. They retain tool/version/hash/path-within-artifact evidence
  needed for verification.
- Dependency, license, secret, export-map, lifecycle-script, CSP, archive, and packaged-server
  checks run on the exact tarball. Network advisory results include retrieval time/source and fail
  closed when the release policy requires fresh data.
- No release script executes arbitrary package/version/tag/publish hooks. Candidate construction
  uses reviewed repository commands, exact targets, and owned temporary directories.
- Accessibility claims require Chromium, Firefox, and WebKit plus keyboard, focus, native forms,
  reduced motion, forced colors, zoom/reflow, JavaScript-disabled fallback, and the complete
  component/interop matrices applicable to each surface.
- Security policy identifies maintained versions, private reporting, response expectations, threat
  boundaries, third-party dependency responsibility, and how a release can be withdrawn/deprecated
  without replaying user writes or hiding known risk.

### Risks

- A late policy can contradict preview behavior. Preview releases must already follow the policies
  drafted in ticket 0003.
- Publishing is an external state change. This ticket prepares and proves the artifact only.
- Run-specific evidence committed into the candidate creates a changing-fingerprint loop. Keep
  generated attestations out of tree and bind them cryptographically to the finalized tree.
- A successful first build can leave gigabytes of temporary installs. Register owned cleanup before
  allocation and self-test pass/fail/signal paths plus zero remaining matching directories.
- A package can pass from the workspace while missing exports/files/dependencies. Install only the
  tarball into isolated consumers with workspace access and dependency hoisting unavailable.
- “All tickets passed” can hide stale or superseded evidence. Validate every stable acceptance ID,
  terminal status, dependency edge, exact-tree report, and superseding decision mechanically.
- Reproducible bytes can still contain the wrong code. Require semantic consumers, public baselines,
  API/type review, security checks, and browser/accessibility behavior in addition to hashes.
- Toolchain or advisory data can change during the candidate run. Pin build tools, record external
  data retrieval, and rerun the full candidate if a required input changes.

### Verification plan

- Validate this Plan and dependency/status manifest before changing version or release files.
- Reconcile every prerequisite ticket/criterion, public baseline item, API report, export, docs
  page, compatibility promise, migration case, security statement, and optional-feature exclusion.
  Fail on stale preview/planned wording or unmapped requirements.
- Exercise candidate preflight against dirty/untracked/ignored-production/shallow/wrong-branch/
  existing-tag/wrong-tool/lock-drift states without modifying the real worktree.
- Build two fresh locked-install candidates, compare exact bytes and normalized manifests, inspect
  package scripts/exports/files/licenses/notices/maps/declarations/archive, and verify temp cleanup
  after success/failure/timeout/TERM/INT using isolated fake roots.
- Install the exact tarball into root/core/UI/Datastar/CSP/testing/Turbo/htmx, external plugin,
  Node/TypeScript/QUnit/browser/UMD/CLI/registry/self-hosted consumers with no
  source/workspace/hoist escape. Run package graph/sentinel/tree-shaking/size/version/private-import
  checks.
- Run root baseline, extension conformance, CSP grammar/threat/policy, bridge version/flow, jQuery
  UI/Mobile migration, website/archive, server boundary, three-browser component, accessibility,
  focus/form/history, and JavaScript-disabled matrices.
- Run fresh dependency/security/license/secret/generated-artifact checks and independently inspect
  all findings, suppressions, skipped gates, report schemas, redaction, receipt hashes, and detector
  self-tests.
- Run `npm run quality:full-audit` and `npm run check` on the finalized unchanged tree, then
  validate Test/Document phases against the immutable report and run `git diff --check`. Do not run
  mutation testing.
- Recompute/read back candidate identity and every handoff command after the final report. Stop at
  the publication authorization boundary.

### Planned files

- `quality/release-contract.json`, `schema/release-contract.schema.json`: Stable entries,
  environments, gates, prerequisite acceptance IDs, optional exclusions, policy/document links, and
  no-mutation requirement.
- `schema/release-candidate.schema.json`: Generated candidate identity, source/tool/dependency
  provenance, artifact manifests/digests, subordinate report hashes, cleanup evidence, and handoff
  shape.
- `scripts/release/prepare.mjs`, `scripts/release/prove.mjs`, `scripts/release/handoff.mjs`:
  Read-only preflight, two-build reproducibility, exact-tarball matrices, immutable out-of-tree
  report, and approval-gated command preview without tag/publish writes.
- `scripts/quality-release.mjs`, `scripts/quality-package.mjs`, quality runner/self-tests: Candidate
  integration, exact-tree/report enforcement, owned temporary cleanup, failure/signal liveness, and
  no mutation lane.
- `package.json`, `package-lock.json`, `src/version.ts`, build/type/API configuration: One package
  version, stable exports, scripts, files, formats, maps, declarations, and reviewed public reports.
- `quality/public-baseline.json`, `etc/jquery-star*.api.md`, production/size budgets: Stable 1.0
  classification, root compatibility, all entry reports, exact graph exclusions, and ratcheted
  measured artifacts.
- Installed consumers and external fixtures under `test/fixtures/` plus package/browser scripts:
  exact tarball root/modular/CSP/testing/bridge/plugin/type/QUnit/UMD/CLI/registry/self-hosting
  proof.
- `CHANGELOG.md`, `SECURITY.md`, `SUPPORT.md`, `MIGRATING_TO_1.md`, `RELEASING.md`, license/notice
  files: Public history, vulnerability process, support window, complete migration, authorization,
  verification, rollback, and third-party notices.
- `README.md`,
  `docs/{README,PROJECT,ARCHITECTURE,BACKEND,RUNTIME_OWNERSHIP,TESTING,INTEROPERABILITY}.md`, jQuery
  migration/stewardship documents, and website pages: Stable supported product truth with no
  preview/unpublished claims.
- `docs/tickets/ROADMAP.md`, prerequisite tickets: Terminal status/disposition and exact
  criterion/evidence/supersession links; no post-1.0 feature implementation.
- `docs/tickets/0017-prepare-stable-platform-release.md`: Phase, ledger, commands, findings,
  candidate identity, criterion evidence, completion audit, and publication handoff boundary.

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

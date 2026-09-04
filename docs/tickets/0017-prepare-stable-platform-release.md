---
id: 0017
title: Prepare the stable 1.0 platform release
status: done
created: 2026-08-30
updated: 2026-09-04
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

- The package and lockfile are `0.1.0`. `src/version.ts` already imports `package.json`, validates
  its stable `major.minor.patch` value, and supplies that value to the root, core, UI, Datastar,
  Turbo, and htmx surfaces. Ticket 0017 owns the one deliberate change to `1.0.0` and proof that no
  copied version remains.
- Every prerequisite ticket from 0001 through 0016 and 0034 through 0050 is `done`. Their committed
  evidence includes the public baseline, real tarball consumers, workflow receipts, hosted GitHub
  inspection, browser/accessibility proof, API/type review, package contents, size budgets, and
  release reproducibility.
- Ticket 0048 removed mutation tooling, commands, dependencies, reports, schemas, and release gates.
  No 1.0 criterion may reintroduce mutation testing unless a future explicit ticket requests it.
- Root, core, UI, Datastar, CSP, testing, Datastar testing, Turbo, and htmx entries ship as tested
  ESM/CommonJS surfaces. The modular, testing, and bridge documentation still calls them 0.4
  previews, so the stable audit must either remove that label with direct evidence or stop.
- `scripts/quality-package.mjs` installs the exact tarball into root, modular, CSP, testing,
  TypeScript, QUnit, browser, UMD, CLI/registry, and bridge consumers. It also checks exports,
  private-import refusal, API reports, package files, peer ranges, bundle graphs, sentinels, sizes,
  and archived jQuery UI/Mobile runtime absence.
- `scripts/quality-release.mjs` already creates two distinct copied workspaces, runs two locked
  installs and self-hosted builds, compares exact file manifests and SHA-256 tarball bytes, writes
  an SBOM and production-license inventory, records provenance eligibility and tool/browser
  versions, and installs and serves the packed website. It does not yet bind those results to a
  clean committed candidate identity, record SHA-512/npm integrity and file modes, audit all
  prerequisite criteria, or write the 1.0 handoff.
- Tickets 0038–0040 completed jQuery ecosystem stewardship plus tested jQuery UI coexistence and
  no-runtime jQuery Mobile migration. Package checks exclude both archived runtimes.
- Tickets 0045, 0046, 0049, and 0050 establish the jQStar name, server-rendered product promise,
  self-hosted reference-matched website, agent corpus, and optional read-only WebMCP surface. Public
  release copy must use jQStar consistently while npm remains `jquery-star`, the CLI/repository
  remains `jqstar`, and `data-jqs` remains markup.
- `scripts/quality-release.mjs` and package quality now clean owned temporary workspaces on success,
  failure, and signals after ticket 0048 repaired a roughly 55 GB leak. The stable gate must prove
  cleanup again under every exit class.
- At Plan start, `feat/stable-platform-release` is clean and non-shallow, has no submodules, and has
  no existing tag. Those observations establish a usable starting point, not candidate evidence; the
  final preflight must recompute them from the committed closure tree.
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
- Audit every acceptance criterion and completion/disposition in tickets 0001–0016 and 0034–0050.
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

- Tickets 0001 through 0016 and 0034 through 0050. Ticket 0048 supersedes ticket 0047's mutation
  branch; both dispositions remain part of the audit trail.

### Acceptance criteria

- [x] [AC-01] Compatibility, environment/document, plugin, expression/CSP, testing,
      interoperability, deprecation, migration, security, support, and release policies are public,
      mutually consistent, versioned where required, and linked to executable 1.0 evidence. No
      preview, roadmap, or planned wording remains on a stable exported surface.
- [x] [AC-02] The 0.1-to-1.0 upgrade guide covers every public addition, behavior/default change,
      deprecation/removal, package subpath, naming convention, CSP incompatibility/migration,
      bridge, and jQuery UI/Mobile path. Each breaking or intentionally unchanged baseline item maps
      to a test and changelog entry.
- [x] [AC-03] `package.json` is the one package-version source. Package/lockfile, root/core/UI/
      Datastar/CSP/testing/Turbo/htmx facades, ESM/CommonJS/UMD artifacts, declarations, source
      maps, CLI/registry output, website/archive metadata, reports, and release notes all report the
      exact candidate version; plugin API and CSP/bridge contract versions remain explicitly
      separate.
- [x] [AC-04] Candidate preparation refuses a dirty, uncommitted, shallow, mismatched-lockfile,
      wrong-branch, ignored-production-input, existing-tag, or unsupported-tool environment before
      creating an artifact. It records the exact commit/tree, source-date, Node/npm/tool versions,
      relevant environment allowlist, and dependency integrity without leaking credentials.
- [x] [AC-05] Two fresh locked-dependency checkouts produce byte-identical npm tarballs with the
      same SHA-256/SHA-512, npm integrity, normalized path/mode/size manifest, generated
      declarations/maps, license/notice inventory, website archive, and package metadata. Every
      owned temporary checkout is removed after pass, failure, timeout, interrupt, and termination
      self-tests.
- [x] [AC-06] The exact tarball passes Node ESM/CommonJS, TypeScript NodeNext/Bundler, browser
      modules, root UMD/CDN/no-build, QUnit, CLI/registry, self-hosting, package-content, private
      deep-import refusal, source-map/declaration/API, `publint`, Are the Types Wrong, and
      license/dependency checks with no workspace/source alias or hoisted undeclared dependency.
- [x] [AC-07] Executed bundle/module-graph/sentinel/size checks prove root is exactly composed
      core + Datastar + UI; core/UI/Datastar/CSP/testing/Turbo/htmx consumers include only requested
      capabilities; and stores, persistence, resources, native navigation, inspection, DevTools,
      upgrade tooling, fixtures, server, registry, and website code are absent from runtime graphs.
- [x] [AC-08] Root behavior, exports, jQuery augmentation, import side effects, directives/actions,
      UI identities, request bytes/default Datastar profile, events, errors, patching, and lifecycle
      remain compatible with every stable 0.1 baseline item or follow its completed deprecation and
      documented migration. No baseline or assertion is edited during candidate testing.
- [x] [AC-09] Installed core/UI/Datastar/testing/external-plugin conformance passes; the CSP entry
      passes its approved grammar/threat corpus under real policies without `unsafe-eval` or trusted
      compiler code; Turbo and htmx pass exact supported-version, preservation, cancel/error,
      history, form/focus, and three-browser coexistence matrices.
- [x] [AC-10] The package contains no jQuery UI or jQuery Mobile runtime/source/style/assets and
      makes no unapproved official-successor claim. jQuery UI coexistence and component migration
      plus the no-runtime jQuery Mobile migration guide match installed/browser fixtures; jQuery
      Core peer, Sizzle, QUnit, and Migrate stewardship decisions match ticket 0038.
- [x] [AC-11] The public jQStar website and packaged self-hosted archive use jQStar itself, match
      the approved reference/ticket 0049, expose current
      API/compatibility/migration/security/download copy, use `jquery-star`/`jqstar`/`data-jqs`
      correctly, and do not claim unpublished npm/tag/ domain state.
- [x] [AC-12] One candidate-bound full-audit report enforces workflow/static/architecture/security/
      dependency/source/style/schema/docs, coverage/property, three-browser/accessibility,
      package/API/type/size/tree-shaking, release reproducibility, temp-cleanup, and
      detector-liveness gates with no hidden baseline, required skip, timeout, weakened threshold,
      or mutation testing.
- [x] [AC-13] Security release checks cover dependency advisories and lock integrity, secret and
      generated-artifact scans, package scripts/exports/files, licenses/notices, CSP claims, server
      demo boundaries, and documented vulnerability reporting. Findings are fixed, explicitly
      accepted through policy, or block the candidate; credentials and private paths are redacted.
- [x] [AC-14] Every criterion in tickets 0001–0016 and 0034–0050 has current Pass or valid terminal
      Approved-Disposition evidence, and every prerequisite ticket is `done` or `declined`. Ticket
      0048's removal decision supersedes mutation work; no blocked, planned, active, stale,
      duplicate, or unmapped 1.0 requirement remains.
- [x] [AC-15] The handoff records the exact candidate commit/tree, tarball
      filename/digests/integrity, immutable report/receipt locations, release notes, expected tag,
      npm dist-tag, read-only verification commands, rollback/deprecation response, and separately
      approval-gated write commands. Preparing or completing this ticket does not tag, publish,
      push, announce, or sign.
- [x] [AC-16] Final `npm run quality:full-audit`, `npm run check`, clean installed-candidate matrix,
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
- `test/release-candidate-contract.test.mjs`, property tests, and isolated release fixtures:
  Fail-closed schema, preflight, identity, prerequisite-audit, redaction, cleanup, and handoff
  sabotage proof.
- `scripts/release/prepare.mjs`, `scripts/release/prove.mjs`, `scripts/release/handoff.mjs`:
  Read-only preflight, two-build reproducibility, exact-tarball matrices, immutable out-of-tree
  report, and approval-gated command preview without tag/publish writes.
- `scripts/quality-release.mjs`, `scripts/quality-package.mjs`, quality runner/self-tests: Candidate
  integration, exact-tree/report enforcement, owned temporary cleanup, failure/signal liveness, and
  no mutation lane.
- `scripts/quality/run.mjs`, `test/quality-runner.test.mjs`, `docs/QUALITY_PROGRAM.md`: Force every
  configured gate only for a release-candidate run and prove ordinary change-scoped selection stays
  intact.
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

| File                                                   | Purpose                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `docs/tickets/0017-prepare-stable-platform-release.md` | Keep phase, scope, files, commands, findings, and evidence.           |
| `quality/release-contract.json`                        | Freeze the stable surface, prerequisites, gates, and policies.        |
| `schema/release-contract.schema.json`                  | Validate the closed hand-authored release authority.                  |
| `schema/release-candidate.schema.json`                 | Validate identity, reports, security proof, cleanup, and handoff.     |
| `scripts/release/lib.mjs`                              | Audit source/tickets/reports, compute hashes, and reject secrets.     |
| `scripts/release/prepare.mjs`                          | Preflight and build two reproducible candidates from fresh clones.    |
| `scripts/release/prove.mjs`                            | Bind full quality and exact-tarball evidence to the candidate.        |
| `scripts/release/handoff.mjs`                          | Write the immutable receipt and print separated release commands.     |
| `scripts/release/candidate.mjs`                        | Run prepare, full audit, delivery, proof, and handoff in order.       |
| `test/release-candidate-contract.test.mjs`             | Prove authority, preflight, redaction, reports, and writes fail shut. |
| `package.json`                                         | Set 1.0.0, stable entries, public files, and release scripts.         |
| `package-lock.json`                                    | Keep the root package and locked candidate version at 1.0.0.          |
| `schema/package-report.schema.json`                    | Match the exact stable package documentation set.                     |
| `scripts/quality/package-release-contracts.mjs`        | Match the exact stable package documentation set.                     |
| `scripts/quality-package.mjs`                          | Verify the 1.0 artifact, public docs, consumers, graphs, and limits.  |
| `scripts/quality-release.mjs`                          | Probe release-policy routes in the reproducible packed website.       |
| `scripts/quality/validate-json.mjs`                    | Enroll the release authority and schema.                              |
| `quality/jquery-mobile-migration.json`                 | Derive the current jQStar migration version as 1.0.0.                 |
| `CHANGELOG.md`                                         | Record 1.0 changes, limits, migration, security, and attribution.     |
| `MIGRATING_TO_1.md`                                    | Publish the complete 0.1-to-1.0 migration.                            |
| `RELEASING.md`                                         | Document candidate proof, approval boundary, checks, and rollback.    |
| `SECURITY.md`                                          | Publish reporting, support, trust, severity, and withdrawal policy.   |
| `SUPPORT.md`                                           | Publish maintained lines and issue expectations.                      |
| `docs/COMPATIBILITY.md`                                | Publish stable entries, environments, lifecycle, and exclusions.      |
| `README.md`                                            | Present stable entries, policy links, and candidate status.           |
| `docs/README.md`                                       | Add release policy and tooling to the project brain.                  |
| `docs/PROJECT.md`                                      | Record the 1.0 package, website, and candidate shape.                 |
| `docs/ARCHITECTURE.md`                                 | Replace preview entry labels with stable ownership.                   |
| `docs/RUNTIME_OWNERSHIP.md`                            | Classify the explicit runtime entries as stable.                      |
| `docs/TESTING.md`                                      | Classify the installed testing entries as stable.                     |
| `docs/INTEROPERABILITY.md`                             | Classify the Turbo and htmx entries as stable.                        |
| `docs/SELF_HOSTING.md`                                 | Add release-policy routes to operational probes.                      |
| `docs/tickets/ROADMAP.md`                              | Record prerequisite closure and the complete 0017 dependency set.     |
| `config/agent-content.json`                            | Add release guides and advance the reviewed corpus to version 4.      |
| `scripts/build-agent-content.mjs`                      | Derive the corpus version from the release authority.                 |
| `example/docs/compatibility/index.html`                | Publish browser-facing stable compatibility.                          |
| `example/docs/migration/index.html`                    | Publish browser-facing 1.0 migration.                                 |
| `example/docs/security/index.html`                     | Publish browser-facing reporting and security boundaries.             |
| `example/docs/download/index.html`                     | Distinguish current npm installation from candidate availability.     |
| `example/docs-shell.html`                              | Add the four release routes to shared navigation.                     |
| `example/index.html`                                   | Label the candidate and link stable release guidance.                 |
| `example/docs/index.html`                              | Present 1.0 support and migration links.                              |
| `example/docs/api/index.html`                          | Present the stable 1.0 API while preserving the 0.1 baseline.         |
| `example/docs/testing/index.html`                      | Replace the testing preview label with stable status.                 |
| `example/docs/interoperability/index.html`             | Replace the bridge preview label with stable status.                  |
| `vite.demo.config.ts`                                  | Build every release-policy route.                                     |
| `scripts/smoke-pages.mjs`                              | Require release routes in the GitHub Pages artifact.                  |
| `scripts/smoke-deployment.mjs`                         | Require release routes in the self-hosted build.                      |
| `scripts/smoke-server.mjs`                             | Fetch release routes from the standalone server.                      |
| `scripts/smoke-package-files.mjs`                      | Require release routes in the packaged website archive.               |
| `e2e/site.spec.ts`                                     | Verify release routes, accessibility, names, and no publish claim.    |
| `test/site-structure.test.mjs`                         | Require each native release route and corpus version 4.               |
| `test/agent-content.test.mjs`                          | Expect the package-derived 1.0 agent corpus.                          |
| `test/webmcp.test.ts`                                  | Expect WebMCP results bound to package version 1.0.0.                 |
| `example/docs/agents/index.html`                       | Regenerate the visible agent guide.                                   |
| `example/agent-content.generated.json`                 | Regenerate the runtime agent index.                                   |
| `example/public/jqstar-agent-index.json`               | Regenerate the public machine-readable index.                         |
| `example/public/llms.txt`                              | Regenerate short discovery with release routes.                       |
| `example/public/llms-full.txt`                         | Regenerate bounded full text with release policies.                   |
| `test/fixtures/csp/conformance-map.json`               | Refresh changed public-expression source locations.                   |
| `test/runtime-install.test.ts`                         | Expect the root runtime at 1.0.0.                                     |
| `test/modular-entrypoints.test.ts`                     | Expect modular runtime entries at 1.0.0.                              |
| `test/render-adapter.test.ts`                          | Expect render ownership at package version 1.0.0.                     |
| `test/public-baseline.test.ts`                         | Keep 0.1 historical evidence separate from current 1.0 identity.      |
| `test/cli.test.ts`                                     | Install the 1.x package range in generated consumers.                 |
| `test/fixtures/external-plugin/package.json`           | Test an external plugin beside the 1.x package range.                 |
| `test/fixtures/mock-navigation-plugin/package.json`    | Test a navigation plugin beside the 1.x package range.                |
| `test/jquery-mobile-migration-contract.test.ts`        | Match migration fixtures to current 1.0 package identity.             |
| `test/package-release-hardening.test.mjs`              | Add timeout cleanup and 1.0 package-report proof.                     |
| `scripts/quality-0044-self-test.mjs`                   | Keep the cleanup/package detector aligned with its 14-test suite.     |
| `scripts/quality/run.mjs`                              | Allow release candidates to force all configured gates.               |
| `test/quality-runner.test.mjs`                         | Prove forced and ordinary changed-path gate selection.                |
| `docs/QUALITY_PROGRAM.md`                              | Document the release-only all-gates runner mode.                      |

### Design changes

- The prerequisite and acceptance audit extends through ticket 0050 because its public agent corpus
  and optional WebMCP surface shipped after this ticket was drafted. Omitting a current public
  surface from the 1.0 audit would make the candidate incomplete. The prepare, prove, and handoff
  split and the no-publishing boundary do not change.
- Four native website routes expose compatibility, migration, security, and download truth from the
  packaged self-hosted archive. They advance the reviewed agent corpus to version 4 and explicitly
  distinguish a proven candidate from npm, Git tag, or GitHub release state.
- The existing immutable packed-size ceiling remains unchanged. Contributor-only component research
  and the detailed CSP threat-model worksheet remain public in the repository through absolute links
  but leave the installed tarball; all user-facing component, CSP, security, compatibility, support,
  migration, and release documents still ship.
- The final candidate references the package, release, static, and browser subordinate reports by
  hash and records the npm advisory source and retrieval time. Unsupported tool ranges and private
  paths embedded in file URLs or messages now fail preflight/redaction.
- A clean committed candidate has no working-tree diff, so ordinary change-scoped delivery may skip
  detector gates. The candidate process explicitly forces all configured full-audit and delivery
  gates; ordinary developer and CI runs keep their existing changed-path selection.

## Test

| Command                                                                                                 | Result | Evidence                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0017-prepare-stable-platform-release.md` | Pass   | The expanded 33-ticket plan and planned-file manifest passed before implementation.                                                                              |
| Focused release tests, first iterations                                                                 | Fail   | Fixed strict tuple schemas, an invalid regular expression, both historical ticket-table layouts, and ticket 0043's approved mutation-removal disposition.        |
| `npx vitest run --reporter=json --outputFile=.git/jqstar/0017-unit.json`                                | Fail   | 920/923 passed; regenerated agent artifacts and CSP source locations.                                                                                            |
| Unit rerun after generation                                                                             | Fail   | 922/923 passed; corrected the WebMCP result from stale 0.1.0 to 1.0.0.                                                                                           |
| Focused release/site/package contract suite                                                             | Fail   | 38/39 passed; exposed a fail-open `>=24` tool-range parser and corrected it.                                                                                     |
| Focused release/site/package contract suite                                                             | Pass   | 39/39 passed after tool-range correction; timeout and signal cleanup also passed.                                                                                |
| `npx vitest run --reporter=json --outputFile=.git/jqstar/0017-unit-final.json`                          | Pass   | 232 suites and 925 tests passed with no failures.                                                                                                                |
| `node scripts/quality/validate-json.mjs`                                                                | Pass   | 72 JSON files, 14 instances, and 21 strict schemas passed.                                                                                                       |
| `npm run build:self-hosted`                                                                             | Pass   | Built 41 website files and the deterministic archive with the four release routes.                                                                               |
| `node scripts/smoke-pages.mjs` after a root-base self-hosted build                                      | Fail   | The command correctly rejected `/` output where `/jqstar/` was required; `npm run build:pages` is the supported invocation.                                      |
| `node scripts/smoke-deployment.mjs && node scripts/smoke-server.mjs`                                    | Pass   | Packaged routes, server, backend, browser runtime, headers, and agent resources passed.                                                                          |
| `npm run test:package:quality`, initial                                                                 | Fail   | Required policies exceeded the immutable packed ceiling by 10,925 bytes.                                                                                         |
| `npm run test:package:quality`, second                                                                  | Fail   | Exact-file probe still named two documents deliberately moved to repository-only scope.                                                                          |
| `npm run test:package:quality`, final                                                                   | Pass   | All 13 checks passed; 219 files, 2,961,970 packed bytes, and 10,355,688 unpacked bytes without a budget increase.                                                |
| `npm run test:release:quality`                                                                          | Pass   | All seven reproducibility, SBOM/license, provenance, tool, browser, and packed-site checks passed.                                                               |
| `npm run build:pages`                                                                                   | Pass   | `/jqstar/` base paths, agent resources, runtime URL, and every new route passed.                                                                                 |
| `npx playwright test e2e/site.spec.ts --project=chromium`                                               | Fail   | Corrected the nonexistent project name to the repository's `desktop-chromium`.                                                                                   |
| `npx playwright test e2e/site.spec.ts --project=desktop-chromium`                                       | Pass   | All ten site tests passed, including the release pages and accessibility scan.                                                                                   |
| `npm run quality:fast`                                                                                  | Pass   | Ticket workflow, runner self-test, format, 925 unit tests, and all 22 fast static analyses passed.                                                               |
| `npm run ticket:validate -- --phase code ... --report <fast-report>`                                    | Pass   | Code-phase validation accepted the current ledger and passing fast report.                                                                                       |
| `npm run check`, initial delivery                                                                       | Fail   | Formatting rejected the edited ticket; the package was 214 bytes over its immutable ceiling, and the dependent detector self-test refused that report.           |
| `npm run check`, corrected delivery                                                                     | Fail   | Eleven substantive gates passed; the liveness detector still expected 13 package-hardening tests after timeout cleanup made the focused suite contain 14.        |
| `npm run test:quality:0044`                                                                             | Pass   | All 16 detector-liveness checks passed after aligning the package-hardening suite count.                                                                         |
| `npm run check`, final Test-phase delivery                                                              | Pass   | All 12 required delivery gates passed against one unchanged 646-file fingerprint.                                                                                |
| `npm run release:prepare -- --run-id 2026-09-04T20-25-00-000Z-17001`                                    | Pass   | Expected refusal: the real dirty worktree produced only a redacted out-of-tree failure receipt and no artifact.                                                  |
| `npm run ticket:validate -- --phase test ... --report <delivery-report>`                                | Fail   | The validator rejected the receipt after its evidence row changed this gated ticket; a fresh unchanged-tree delivery is required.                                |
| `npm run ticket:validate -- --phase test ... --report <fresh-delivery-report>`                          | Fail   | The validator required the exact non-empty `Inspection ledger` table; equivalent inspection bullets were not accepted.                                           |
| `npm run check` after adding the inspection ledger                                                      | Pass   | All 12 delivery gates passed in run `2026-09-04T20-35-59-865Z-97650` against one unchanged 646-file fingerprint.                                                 |
| `npm run quality:delivery` through the final `npm run check`                                            | Pass   | The delivery runner produced the authorized immutable report for run `2026-09-04T20-35-59-865Z-97650`.                                                           |
| `npm run ticket:validate -- --phase test ... --report <20-35-59-report>`                                | Pass   | Test-phase validation accepted the authorized immutable delivery report before Document work began.                                                              |
| First clean-commit `npm run release:candidate`                                                          | Fail   | Preparation and all 14 full-audit gates passed; proof rejected the delivery receipt because two change-scoped detector gates were skipped on a clean tree.       |
| `node --test test/quality-runner.test.mjs`                                                              | Pass   | All 24 runner tests passed, including ordinary skip preservation and forced execution of a changed-path-selected gate.                                           |
| `npx vitest run test/release-candidate-contract.test.mjs`                                               | Pass   | All six candidate contract tests passed, including the release-only all-gates orchestration assertion.                                                           |
| `npm run quality:fast`                                                                                  | Pass   | All five fast gates passed after the all-gates correction.                                                                                                       |
| `npm run ticket:validate -- --phase code ... --report <21-51-19-report>`                                | Pass   | Code-phase validation accepted the updated ledger and exact fast report.                                                                                         |
| `npm run check` after the all-gates correction                                                          | Pass   | All selected delivery gates passed against the unchanged correction tree; ordinary change-scoped skips remained explicit.                                        |
| `npm run ticket:validate -- --phase test ... --report <21-52-36-report>`                                | Pass   | Test-phase validation accepted the exact authorized delivery receipt.                                                                                            |
| Second clean-commit `npm run release:candidate`                                                         | Fail   | Thirteen substantive full-audit gates passed, including the forced detector; the inherited flag incorrectly forced the runner self-test's ordinary-skip fixture. |
| `JQS_QUALITY_FORCE_ALL=1 node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs`        | Pass   | All 34 tests passed; direct runner calls preserve ordinary selection while explicit forced calls execute selected gates.                                         |
| `npx vitest run test/release-candidate-contract.test.mjs`                                               | Pass   | All six candidate contract tests passed after scoping the flag to the CLI entrypoint.                                                                            |
| `npm run quality:fast`                                                                                  | Pass   | All five fast gates passed after the CLI-boundary correction.                                                                                                    |
| `npm run ticket:validate -- --phase code ... --report <22-24-11-report>`                                | Pass   | Code-phase validation accepted the updated evidence and exact fast report.                                                                                       |
| `npm run check` after the CLI-boundary correction                                                       | Pass   | Delivery passed against the unchanged correction tree; ordinary selection remained explicit and the runner self-test passed.                                     |
| `npm run ticket:validate -- --phase test ... --report <22-25-37-report>`                                | Pass   | Test-phase validation accepted the exact authorized delivery receipt.                                                                                            |

### Inspection ledger

| Finding                                                                                                   | Resolution                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| The tool-range comparison parsed `>=24` as no version and could fail open.                                | Parse range prefixes and inject Node 23/npm 10 in sabotage tests; both now stop preflight.                                  |
| Required release policies exceeded the immutable package ceiling.                                         | Keep the ceiling; retain contributor-only engineering documents in the repository and ship every user-facing policy.        |
| Timeout cleanup increased the package-hardening suite while its liveness detector retained the old count. | Require all 14 package-hardening tests; the complete 16-detector self-test now passes.                                      |
| Candidate preparation could accidentally be assumed to work from the implementation tree.                 | Run it on the real dirty tree; it stopped before packing and wrote only a redacted out-of-tree failure receipt.             |
| Release command strings could be mistaken for authorized work.                                            | Static tests prove tag, push, publish, and GitHub release operations exist only in the separately approval-gated handoff.   |
| Document validation requires the literal delivery command rather than only its `check` wrapper.           | Record the `quality:delivery` gate and its exact authorized run alongside the wrapper command.                              |
| A clean candidate delivery used ordinary diff selection and skipped two required detector gates.          | Add a release-only all-gates runner mode, test it, and require the candidate orchestrator to use it for both quality modes. |
| The all-gates environment flag also changed direct programmatic runner calls inside its own tests.        | Interpret the environment only at the CLI boundary; direct calls now require an explicit `forceAll: true` option.           |

## Document

### Documentation changed

- `CHANGELOG.md`, `MIGRATING_TO_1.md`, `RELEASING.md`, `SECURITY.md`, and `SUPPORT.md` publish the
  1.0 history, complete upgrade path, release authorization boundary, vulnerability process,
  maintained lines, verification, and withdrawal response.
- `README.md` and `docs/COMPATIBILITY.md` identify the stable entries, package/runtime identities,
  supported environments, public policy links, optional-feature exclusions, and candidate state.
- `docs/README.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`,
  `docs/TESTING.md`, `docs/INTEROPERABILITY.md`, and `docs/SELF_HOSTING.md` record the stable
  platform, evidence ownership, supported bridges, and packaged-site operations in the project
  brain.
- The native compatibility, migration, security, and download routes expose the same policy in the
  public website and packaged self-hosted archive without claiming that npm, a tag, or a GitHub
  release already exists.
- `config/agent-content.json` and the regenerated agent index and text corpora publish the reviewed
  1.0 guidance as corpus version 4.
- `docs/tickets/ROADMAP.md` records closure of the complete 1.0 prerequisite set and leaves stores,
  resources, native navigation, inspection, DevTools, and upgrade diagnostics on their later
  optional tracks.
- `docs/QUALITY_PROGRAM.md` distinguishes ordinary changed-path gate selection from the release
  candidate's mandatory all-gates runs.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                        |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `quality/release-contract.json`, its strict schema, the public policy documents, and installed package/site checks freeze one consistent stable surface; static documentation checks reject stale preview and planned claims.                                                                   |
| AC-02     | Pass   | `MIGRATING_TO_1.md` and `CHANGELOG.md` map the 0.1 baseline through the previews to every stable entry, default, lifecycle rule, bridge, CSP difference, naming convention, and jQuery UI/Mobile path covered by tests.                                                                         |
| AC-03     | Pass   | Package and lockfile are 1.0.0; runtime, CLI, registry, declarations, maps, browser, website, corpus, archive, and report checks derive that identity from `package.json`, while plugin API and CSP grammar retain their independent versions.                                                  |
| AC-04     | Pass   | Release preflight tests reject dirty, untracked, ignored-production, shallow, wrong-branch, tagged, lock-drift, Node 23, and npm 10 inputs. The real dirty worktree refusal wrote only a redacted failure receipt and no artifact.                                                              |
| AC-05     | Pass   | Release quality produces and compares two locked fresh-clone tarballs by SHA-256, SHA-512, npm integrity, shasum, metadata, path, mode, size, declarations, maps, notices, archive, and behavior; cleanup tests cover success, failure, timeout, and signals.                                   |
| AC-06     | Pass   | Package quality's 13 checks install the exact tarball into root, modular, CSP, testing, TypeScript, QUnit, browser, UMD, CLI/registry, bridge, and self-host consumers and enforce exports, types, maps, licenses, `publint`, ATTW, and isolation.                                              |
| AC-07     | Pass   | Installed module-graph, sentinel, export, composition, and immutable-size checks prove each entry contains only its requested capability and exclude every named post-1.0 feature plus fixtures, server, registry, and website code.                                                            |
| AC-08     | Pass   | The 0.1 public baseline and 925 unit tests pass unchanged against 1.0, covering root behavior, exports, jQuery augmentation, effects, requests, events, errors, patching, UI identities, and disposal.                                                                                          |
| AC-09     | Pass   | Installed conformance covers core, UI, Datastar, testing, external plugins, the reviewed CSP grammar/threat corpus, and exact Turbo/htmx lifecycles; browser quality passes Chromium, Firefox, and WebKit matrices.                                                                             |
| AC-10     | Pass   | Package, dependency, source, archive, bundle, and browser checks exclude archived jQuery UI/Mobile runtimes. The public coexistence/migration guides and fixtures implement ticket 0038's independent-project stewardship decisions.                                                            |
| AC-11     | Pass   | Site structure, self-host, package, deployment, server, browser, accessibility, and agent-corpus checks cover every current API/policy route, approved names, the reference layout, and the explicit not-yet-published state.                                                                   |
| AC-12     | Pass   | `release:candidate` forces every configured gate, then binds the clean committed tree to matching full-audit and delivery reports, exact fingerprints, package/release/static/browser subordinate hashes, and the installed tarball; missing, skipped, reordered, or stale reports fail closed. |
| AC-13     | Pass   | Static, package, release, and candidate checks cover audit freshness, lock integrity, secrets, generated artifacts, scripts, exports/files, licenses, CSP and server boundaries, redaction, and the documented private-reporting process.                                                       |
| AC-14     | Pass   | The strict prerequisite audit reads all 33 tickets from 0001–0016 and 0034–0050, requires terminal status and one valid result per criterion, accepts only explicit dispositions, and verifies ticket 0048 supersedes mutation work.                                                            |
| AC-15     | Pass   | The immutable candidate schema and handoff bind commit/tree, package filename and digests, subordinate receipts, notes, tag/dist-tag expectations, read-only checks, rollback response, and separately labeled approval-required commands; tests prove no write is executed.                    |
| AC-16     | Pass   | The finalized committed ticket is the input to the all-gates `quality:full-audit`, `check`, Document validation, whitespace checks, and clean `release:candidate` run. Its out-of-tree receipt proves the final fingerprint and exact installed-candidate matrix without mutation testing.      |

### Completion audit

All 16 criteria have one current evidence row. The first clean candidate correctly failed closed on
two skipped required gates; the release-only all-gates correction preserves ordinary selection while
making skips impossible in candidate evidence. The stable surface authority, public policies, 1.0
package identity, prerequisite audit, clean-source preflight, reproducible artifact, installed
consumer matrix, security checks, website/archive, and immutable handoff form one fail-closed
candidate path. Optional post-1.0 services remain absent from stable exports and do not block this
release.

The candidate command writes evidence only beneath `.git/jqstar/releases/1.0.0/`. It does not create
or push a tag, publish to npm, create a GitHub release, sign, attest, or announce. Those operations
remain separately approval-gated after the candidate receipt has been inspected. No unresolved
finding or unchecked criterion remains.

Status: Complete

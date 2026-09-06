---
id: 0032
title: Add package upgrade diagnostics
status: done
created: 2026-08-30
updated: 2026-09-06
---

# 0032: Add package upgrade diagnostics

## Plan

### Problem

The current CLI diagnoses source-registry configuration and installed recipes. A modular stable
library also needs a trustworthy way to explain package, jQuery, environment, entrypoint, plugin,
and configuration incompatibilities during upgrades.

A doctor that guesses from arbitrary source text, executes project code, contacts a registry,
rewrites dependency manifests, or treats a lockfile mention as runtime proof would create more risk
than it removes. Machine output and exit behavior must remain stable enough for CI while human
output must distinguish direct evidence, inference, unknown state, warning, and blocking
incompatibility.

### Current evidence

- jqstar doctor currently checks registry configuration and copied recipes. The CLI owns source
  installation, dry runs, overwrite protection, and project-local path rules.
- Ticket 0013 defines package entrypoints, supported formats, peers, public versions, plugin ranges,
  and deprecations. Ticket 0017 freezes the stable compatibility and migration policies.
- Plugin npm-package authoring is different from copying registry source. The CLI must not claim
  ownership of package-manager files or source-owned registry recipes it did not create.
- Ticket 0038 assigns jQuery UI, jQuery Mobile, QUnit, Sizzle, and jQuery Migrate ecosystem policy;
  tickets 0039 and 0040 own the application migration guides.
- Package manifests and recognized lockfiles can prove installed/resolved metadata, but CDN scripts,
  generated bundles, import maps, runtime globals, or dynamically selected pages may remain unknown.
- No versioned diagnostic schema, compatibility-rule manifest, migration journal, or stable doctor
  exit contract currently covers package upgrades.

### Activation gate

Before Code, import exact supported Node, jQuery, jQStar entrypoint/module-format, plugin API,
config schema, and ecosystem migration ranges from tickets 0013, 0017, and 0038–0040. Freeze a
dated, repository-owned compatibility rules manifest and a diagnostic-code registry. Every rule
identifies its authoritative source, evidence inputs, severity, remediation link, and expiry/review
policy. Plan-validate the list; the CLI must not fetch changing compatibility rules at runtime.

Ticket 0038 supplies mapping `jquery-ecosystem.migrate.doctor-input` in
`quality/jquery-ecosystem.json` at SHA-256
`2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. Activation must consume that
exact matrix or refresh its primary sources and every downstream digest first.

### Scope

- Extend the installed jqstar doctor command without changing existing init, list, add, or registry
  doctor semantics. Package diagnostics run from an explicit project directory, resolve it through
  the existing safe boundary, and never traverse above the selected project/workspace root.
- Publish a versioned jqstar-doctor-report/1 JSON schema and matching human renderer. Each
  diagnostic has a stable code, severity, confidence/evidence kind, bounded summary, affected
  package/config path, observed value, expected range, documentation URL, and proposed correction.
  JSON ordering is deterministic and contains no ANSI output.
- Define exit status: 0 when no error diagnostics exist, 1 when one or more supported
  incompatibility errors exist, and 2 for invalid CLI usage, unsafe path, unreadable/malformed
  required input, or internal execution failure. Warnings/unknowns do not become false errors;
  quiet/JSON modes preserve the same status.
- Inspect only bounded recognized metadata: nearest/workspace package.json files, supported lockfile
  records, jQStar config schemas, installed package.json exports/versions, generated jQStar
  ownership manifests, and explicit CLI arguments. Do not execute config files, package lifecycle
  scripts, imported modules, package managers, browsers, or application JavaScript.
- Detect jQStar package/version duplication, root and modular entrypoint use, deprecated/removed
  entrypoints, jQuery peer mismatch or duplication, supported Node/tooling range, config schema
  version, plugin API incompatibility, copied-registry ownership mismatch, and package artifact
  identity. Treat peer dependency placement and workspace resolution as evidence, not simplistic
  node_modules path assumptions.
- Report jQuery UI, jQuery Mobile, and jQuery Migrate only from direct manifest/lock/package
  metadata with stable ecosystem codes and migration links. A dependency record is detection, not
  proof that code executes. CDN/runtime/generated-asset cases are explicitly unknown. Never load an
  archived runtime or suppress/interpret individual Migrate warnings as safe automatic rewrites.
- Document an opt-in jQuery Migrate workflow that the application owner runs in a representative
  browser. Doctor may ingest a versioned, user-supplied warning summary file after schema validation
  and report categories/links; it does not inject scripts, collect browser output, or auto-fix code.
- Add explicit dry-run and apply modes only for known jQStar configuration-schema migrations. A
  migration plan records old/new schema, exact target, canonical before/after hashes, ordered
  operations, backup path, file mode, and rollback command. Default is dry-run; package manifests,
  lockfiles, application source, registry recipes, and third-party configuration are never mutated.
- On apply, re-read and verify the planned before hash, reject symlinks/non-regular files and paths
  outside the resolved project boundary, schema-validate before and after, write a sibling temporary
  file, preserve safe permissions, atomically rename, and create a same-boundary backup with
  exclusive creation. Failure before rename leaves the original untouched; failure after rename
  reports the exact recovery path and never deletes the backup.
- Make migrations idempotent and journaled. Reapplying the target schema makes no write/backup;
  rollback verifies current and backup hashes before an atomic restore and refuses divergence. The
  journal stores paths/hashes/schema/operations only—never config values likely to contain secrets.
- Enforce bounded files, workspace/package counts, diagnostics, strings, recursion depth, and
  runtime. Detect cycles/duplicate workspace roots and produce a stable truncation diagnostic rather
  than unbounded scanning.
- Perform no network request/write, dependency installation/removal/update, Git operation, external
  process launch, telemetry, or package publication. Documentation links are printed as static data.

### Out of scope

- Scaffolding npm plugins, rewriting arbitrary JavaScript/TypeScript/HTML/CSS, changing package.json
  dependencies, editing lockfiles, running package managers, or silently changing copied recipes.
- Proving runtime CDN/import-map/generated-bundle use from source search; loading jQuery UI/Mobile/
  Migrate; interpreting every third-party jQuery plugin; or guaranteeing an application is upgrade
  compatible without its tests.
- Network-fetched advisories/rules, vulnerability scanning, automatic dependency upgrades, or secret
  backup facilities.

### Dependencies

- Tickets 0013, 0017, 0038, 0039, and 0040 for the compatibility and migration facts this command
  reports.

### Acceptance criteria

- [x] [AC-01] Activation freezes a dated compatibility-rule manifest and unique diagnostic registry
      for supported Node, jQuery, jQStar, entrypoint, plugin, config, and ecosystem ranges, with
      authoritative source, evidence inputs, severity, remediation, and review date; Plan validation
      passes before Code.
- [x] [AC-02] Existing init/list/add/source-registry doctor behavior, path ownership, dry-run, and
      overwrite contracts remain compatible in exact installed-CLI regression fixtures.
- [x] [AC-03] jqstar-doctor-report/1 JSON is schema-valid, deterministic, bounded, ANSI-free, and
      records code, severity, confidence/evidence kind, affected package/path, observed/expected,
      correction, and static documentation link without leaking configuration values.
- [x] [AC-04] Exit 0/1/2 behavior is exact across human, JSON, quiet, warning-only, unknown,
      incompatibility, malformed input, unsafe path, and internal-failure cases; stable codes rather
      than prose are the automation contract.
- [x] [AC-05] Recognized metadata detects compatible/incompatible package and jQuery peers,
      duplicate jQStar/jQuery resolution, Node/tooling ranges, obsolete entrypoints, config schema,
      plugin API, ownership, and installed artifact identity across npm, pnpm, Yarn, workspaces,
      hoisting, and absent node_modules fixtures without executing project or package code.
- [x] [AC-06] jQuery UI, jQuery Mobile, and jQuery Migrate results distinguish direct dependency,
      transitive/lock presence, installed metadata, and unknown runtime use. The command never loads
      those runtimes and never presents a Migrate warning as an automatic safe rewrite.
- [x] [AC-07] The opt-in Migrate guide and optional schema-validated summary import report bounded
      warning categories and migration links only; doctor performs no browser injection, collection,
      arbitrary log parsing, source rewrite, or warning suppression.
- [x] [AC-08] Default config migration is a deterministic dry run with exact target, schema,
      before/after hashes, ordered operations, backup/recovery plan, and no filesystem mutation.
      Package/lock/source/registry/third-party files are unconditionally outside writable scope.
- [x] [AC-09] Apply revalidates the before hash and path, rejects symlink/non-regular/out-of-bound
      targets, validates schemas, uses exclusive backup and atomic sibling replacement, preserves
      safe mode, and reports recoverable state for every injected failure boundary.
- [x] [AC-10] Reapply is a no-op; rollback verifies hashes and atomically restores only an unchanged
      migration result. Journals/backups are bounded, permission-safe, never silently overwritten or
      deleted, and contain no secret config values in diagnostic output.
- [x] [AC-11] File/workspace/package/diagnostic/string/depth/time budgets and cycle/duplicate-root
      handling stop adversarial projects deterministically with an explicit truncation/error result.
- [x] [AC-12] Network, process-spawn, package-manager, lifecycle-script, module-execution,
      telemetry, Git-write, dependency-write, and publish canaries prove doctor is local and
      read-only except the separately authorized known-config apply/rollback operations.
- [x] [AC-13] Tarball consumers execute the installed bin and installed compatibility manifest from
      npm/pnpm/Yarn-like fixture layouts, not repository scripts, and verify package/version
      identity, Windows/POSIX path behavior, declarations where applicable, and packaged
      documentation links.
- [x] [AC-14] Focused, coverage/property/static/security, package/release, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

### Activation design recorded 2026-09-06

- Preserve `jqstar doctor` and its existing JSON array/exit behavior. Activate the new stable report
  with `jqstar doctor --packages --cwd <project>`. Optional `--json`, `--quiet`, repeated
  `--entrypoint`, `--format`, and `--migrate-summary` inputs stay explicit. Unknown flags and
  incompatible modes fail with exit 2 in the new command mode.
- Recognize npm lockfile versions 2/3, pnpm lockfile 9, and Yarn Classic v1/modern YAML lockfiles.
  Preserve direct manifest, lock resolution, and installed metadata as distinct evidence.
  Unsupported formats and unresolved aliases/protocols produce unknown diagnostics instead of
  guessed versions. Resolve declared workspace and installed-package metadata only within the
  selected real root. Never evaluate `.pnp.cjs`, JavaScript configuration, lifecycle scripts, or
  application modules.
- The frozen authority is package/release metadata, plugin API `0.1.0`, legacy configuration schema,
  and the exact 0038 matrix digest already recorded above. Ship `bin/doctor/compatibility.json` with
  source hashes, supported entries/formats/ranges, diagnostic codes, severity/remediation, review
  date, and expiry policy. Rules are local immutable data during a run.
- Use maintained parsers for recognized lockfile syntax and semantic version ranges. Candidate
  dependencies are `semver`, `yaml`, and the official Yarn parser; verify pinned versions and
  production graph cost before implementation. Parsers receive bounded bytes and produce only
  validated plain data. YAML aliases, duplicate keys, exotic tags, and excessive nesting are
  refused.
- Treat the existing unversioned `jquery-star.json` as schema 0. The sole initial migration adds
  `configVersion: 1` while preserving validated `output`, `blocksOutput`, `registry`, and `$schema`.
  Existing init/add/list/doctor semantics continue accepting legacy configuration. The current
  published config schema accepts legacy or explicit version 1; unknown fields/versions are refused
  by the new migration engine.
- `jqstar doctor --upgrade-config` is read-only planning. `--apply <plan-file>` and
  `--rollback <journal-file>` are explicit separate modes. Plans bind the exact original byte hash,
  canonical data hash, target byte/data hashes, operation list, safe mode, sibling backup, and
  journal. Apply validates all fields against a recomputed known migration; arbitrary operations or
  destinations are refused. A stale plan cannot overwrite a later edit.
- Writable files are the selected root's `jquery-star.json`, exclusive sibling backup/journal, and
  owned sibling temporary files. Reject symlinks, special files, path traversal, and path or
  identity changes between validation and replacement. Create backup/journal before replacement,
  preserve safe target permissions, and report recovery metadata without configuration contents.
  Rollback verifies current and backup hashes and retains recovery files. Reapply performs no
  writes.
- Freeze resource bounds at 2 MiB per metadata file, 16 MiB total bytes, 256 workspaces, 4096
  packages, 1024 diagnostics, 256 characters per public scalar, data depth 32, workspace depth 8,
  and 10 seconds of discovery/rule processing. Check budgets during traversal; never print parser
  error source excerpts. A deterministic truncation diagnostic stops an incomplete scan from
  masquerading as complete.
- Primary format references:
  [npm package-lock](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/),
  [pnpm lockfile 9](https://github.com/pnpm/spec/blob/master/lockfile/9.0.md),
  [Yarn parsers](https://yarnpkg.com/api/yarnpkg-parsers), and
  [YAML parser options](https://eemeli.org/yaml/). These are development references; doctor fetches
  none of them at runtime.

### Design

The command has four pure layers: bounded metadata discovery, evidence normalization, data-driven
rule evaluation, and human/JSON rendering. Rules never read files themselves. This makes the same
fixture produce the same diagnostics regardless of output mode and prevents a message rewrite from
changing exit behavior.

Known config upgrades use a two-step plan/apply protocol. A plan is valid only for the exact
canonical before hash. Apply performs boundary and hash checks again, validates both schemas, and
uses atomic replacement with an exclusive backup. Rollback is another verified atomic transition,
not a blind copy. No general codemod API is introduced.

Workspace discovery stops at the selected root and uses only declared supported workspace forms.
Resolved dependency evidence retains its source and confidence so the report can say detected,
inferred, or unknown instead of upgrading guesses into facts.

### Decisions

- Doctor is offline, metadata-driven, deterministic, and bounded.
- Stable codes/schema/exit status are the automation API; human prose can improve compatibly.
- Unknown is a valid result when metadata cannot prove runtime use.
- Only known jQStar config schemas are writable, only under explicit apply/rollback.
- Package manifests, locks, sources, recipes, dependencies, and third-party configs remain
  untouched.
- Compatibility rules ship with the CLI and are evidence-dated; no runtime registry lookup occurs.

### Security and accessibility

- Config values may contain credentials. Reports, journals, hashes, and error summaries expose
  paths, schema fields, categories, and digests—not raw values. Backup guidance requires local
  permission review and exclusion from version control.
- Path validation uses resolved project boundaries and rejects symlinks for write targets. Atomicity
  and exclusive backup creation prevent partial overwrite and backup clobbering.
- Human output uses plain text headings and severity/code labels, not color alone. JSON provides the
  complete accessible machine representation.

### Risks

- Lockfile formats evolve. Support exact parsed versions, label unsupported versions unknown, and
  never fall back to arbitrary text heuristics.
- Monorepo hoisting can look like duplication. Keep resolution evidence per workspace/consumer and
  distinguish intentional shared resolution from incompatible simultaneous majors.
- Backups can duplicate secrets. Keep apply opt-in, preserve restrictive modes, never print
  contents, and document secure deletion as a user-controlled action.
- Static compatibility facts age. Give each rule an authority and review date and update them
  through a ticket rather than a network call.

### Verification plan

- Table/property-test rule evaluation, ordering, bounds, exit status, human/JSON parity, unsupported
  metadata, workspaces/hoisting, cycles, secrets, and diagnostics from pure fixtures.
- Run filesystem fault-injection for dry-run/apply/idempotence/rollback, symlinks, races, hash
  drift, permissions, exclusive backups, atomic rename boundaries, malformed schemas, and recovery.
- Pack/install the CLI into npm/pnpm/Yarn-like temporary consumers and assert the repository source
  is unavailable; install spawn/network/write canaries around every command.
- Run existing CLI/source-registry suites and
  focused/fast/coverage/property/static/security/package/ release/check/ticket/diff gates without
  mutation testing.

### Planned files

- CLI doctor discovery, compatibility rules, evaluators, renderers, limits, and exit-code modules.
- Versioned diagnostic, rules, migration-plan, journal, and optional Migrate-summary JSON schemas.
- Known jQStar config migration definitions plus atomic plan/apply/rollback implementation.
- Unit/property/fault-injection and exact-installed npm/pnpm/Yarn/workspace fixtures.
- Public upgrade/Migrate/ecosystem diagnostics docs, CLI reference, project security/testing docs,
  package manifest, and this ticket.

## Code

### Changed-file ledger

| File                                                                                                                                                       | Purpose                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bin/jqstar.mjs`, `bin/doctor/*.mjs`                                                                                                                       | Explicit modes, bounded discovery/rules/output, configuration plans, protected writes, and recovery. |
| `bin/doctor/compatibility.json`                                                                                                                            | Frozen support facts, authority digests, formats, diagnostic registry, and limits.                   |
| `package.json`, `package-lock.json`                                                                                                                        | Pin CLI-only parsers and semantic-version evaluation; package the upgrade guide.                     |
| `schema/jquery-star.schema.json`, `schema/doctor*.schema.json`                                                                                             | Versioned config, report, plan, journal, summary, ownership assertion, and rule schemas.             |
| `test/doctor*.test.mjs`, `test/fixtures/doctor*.mjs`                                                                                                       | Metadata, privacy, faults, concurrency, forbidden-effect canaries, and actual CLI consumers.         |
| `test/property/doctor.property.test.mjs`, `vitest.property.config.ts`                                                                                      | Generated exact-byte recovery and semantic identity; include MJS properties.                         |
| `scripts/quality/doctor-contract.mjs`, `scripts/quality/validate-json.mjs`                                                                                 | Validate schemas and support/export/ecosystem authority in the static gate.                          |
| `quality/production-census.json`                                                                                                                           | Classify shipped doctor metadata and process evidence.                                               |
| `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`                                                                                           | Require installed doctor files and exercise its consumer contract.                                   |
| `scripts/quality/package-release-contracts.mjs`, `schema/package-report.schema.json`                                                                       | Bind the exact packed documentation list.                                                            |
| `docs/UPGRADES.md`, `README.md`, `CHANGELOG.md`                                                                                                            | Public modes, limits, output, migration, and recovery.                                               |
| `docs/README.md`, `docs/TESTING.md`, `docs/COMPATIBILITY.md`, `docs/JQUERY_ECOSYSTEM.md`                                                                   | Brain links, tests, candidate policy, and opt-in ecosystem diagnostics.                              |
| `example/docs/compatibility/index.html`, `example/docs/index.html`                                                                                         | Native website package-doctor guidance.                                                              |
| `quality/release-contract.json`, `schema/release-contract.schema.json`, `schema/release-candidate.schema.json`, `test/release-candidate-contract.test.mjs` | Revised candidate owner, six excluded surfaces, 40 completed prerequisites, and 19 policies.         |
| `config/agent-content.json`, `test/site-structure.test.mjs`                                                                                                | Reviewed corpus version 6 and its assertion.                                                         |
| `example/agent-content.generated.json`, `example/public/jqstar-agent-index.json`                                                                           | Regenerated machine-readable corpus.                                                                 |
| `example/docs/agents/index.html`, `example/public/llms.txt`, `example/public/llms-full.txt`                                                                | Regenerated human and text corpus.                                                                   |
| `test/fixtures/csp/conformance-map.json`                                                                                                                   | Refresh README expression line locations without changing grammar.                                   |

### Design changes

Closure inspection added the existing legacy-command regressions to the installed consumer. All 13
contract groups passed against the delivery tarball before inclusion in the maintained fixture. The
candidate manifest now requires completed 0032, 0051, and 0052 and the public upgrade policy; strict
schema counts and release-contract tests follow that roster.

Activation Plan passed before behavior changes. Add explicit package and migration doctor modes
while preserving legacy commands. Use semver 7.8.5, yaml 2.9.0, and official @yarnpkg/parsers 3.1.0
as CLI-only dependencies; no runtime entry imports them.

The release schema now binds ticket 0032 and six absent optional runtime surfaces. The exact packed
documentation schema includes the upgrade guide and the 0031 decision. Website guidance fits the
existing 190,000-byte agent index limit after shortening its summary; full instructions remain in
the shipped guide. Corpus version 6 and generated CSP example line references track those edits.

Ownership metadata is an optional application-supplied assertion. Legacy registry commands never
generated it, so doctor compares declared copy destinations without claiming file-byte ownership or
requiring old copied recipes to match the current package version. Reads are bounded metadata
snapshots; the deadline checks between operations cannot interrupt a stalled OS call. Migration
locks coordinate doctor processes, with identity/hash rechecks and explicit same-privilege writer
limitations documented. pnpm importer indexing is linear and separately bounded. Recovery paths
remain available for failures during rollback as well as apply.

## Test

| Command                                         | Result         | Evidence                                                                                                                      |
| ----------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Plan validator                                  | Pass           | Frozen 0038 digest and activation design verified before Code.                                                                |
| Initial new doctor tests                        | Fail then pass | A filesystem URL under jsdom exposed the wrong test realm; CLI tests now explicitly select Node.                              |
| Focused metadata/migration/legacy CLI suite     | Pass           | 60 cases, including 14 unchanged legacy CLI cases; all completed 2026-09-06.                                                  |
| Initial generated migration property            | Fail           | Real file/directory flushes exceeded the default five-second timeout; retained all 100 cases with a scoped 30-second timeout. |
| Focused doctor properties                       | Pass           | Two properties, 100 cases each; durable exact-byte round trip and distinct byte/semantic identities.                          |
| Rule authority and effect-canary consumer suite | Pass           | Eight tests; four lock formats, three enforced forbidden-effect controls, five read-only snapshots, apply/reapply/rollback.   |
| `npm run quality:fast`                          | Pass           | `2026-09-06T03-20-21-263Z-64540`; Code-phase validator accepted this exact run before entering testing.                       |
| `npm run quality:delivery` (`npm run check`)    | Pass           | Exact report `2026-09-06T04-09-28-284Z-93807`; all 13 gates.                                                                  |

Fast run `2026-09-06T03-17-54-443Z-52662` failed: unit evidence recorded 1,146 passing and three
failing cases (stale CSP line inventory, exact package-document schema, and corpus-version
assertion). Static analysis found two unused doctor helper exports; format found the recorded
research JSON needed canonical formatting. Corrected each owner and added formatting to the research
recorder. The initial self-hosted build stopped on the agent-index byte limit; a shorter website
summary restored the unchanged ceiling (189,732 of 190,000 bytes). The subsequent
demo/server/archive build passed. Current dry pack is 257 files, 3,165,399 compressed and 11,104,427
unpacked bytes.

Fast run `2026-09-06T03-20-21-263Z-64540` passed all six gates with 1,149 unit tests. Code-phase
validation accepted that exact report before this status/ledger update. Full delivery, installed
package proof, and acceptance closure were still pending at that point.

An installed-rules read-failure canary now verifies `JQS_INTERNAL_ERROR`, exit 2, and schema-valid
null package/rule-date metadata without exposing the raw filesystem error. The report schema and
public guide explicitly describe those unavailable facts. Added direct Node/tooling/expiry checks
and distinct manifest/lock/installed ecosystem evidence checks before acceptance closure.

Delivery `2026-09-06T04-09-28-284Z-93807` passed all 13 enforced gates with 1,199 unit tests, 50
property tests, 29 static checks, 481 browser cases, 13 package checks, seven release checks, and
the detector self-tests. No browser case failed, skipped, or passed only on retry. The exact report
was Test-phase validated before closure edits.

The maintained fixture, doctor authority, decision, and expanded release contract pass 23 focused
tests after closure. The installed legacy proof records 13 command-contract groups against the exact
delivery tarball. Its scratch fixture initially used an incorrect relative guard path; correcting
that path restored the required positive denial controls before any package test was accepted.

### Inspection ledger

| Finding                                                                  | Resolution                                                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Installed rules can fail to load before report metadata exists.          | Emit a bounded schema-valid internal-error report with null unavailable facts; the installed-bin canary verifies exit 2 and redaction. |
| Registry ownership declarations cannot establish file-byte identity.     | Compare declared destinations and state the evidence limit in diagnostics and the guide.                                               |
| pnpm importer scans and installed-package queues can grow independently. | Check importer, declaration, and enqueue budgets during traversal; preserve explicit incomplete results.                               |
| Rollback failures need the same recovery detail as apply failures.       | Preserve the validated plan and report exact journal and backup paths on rollback errors.                                              |
| Atomic rename cannot exclude every uncooperative same-privilege writer.  | Recheck identity, bytes, and mode, coordinate doctor processes with exclusive locks, and document the remaining OS boundary.           |

## Document

### Documentation changed

`docs/UPGRADES.md`, README/CHANGELOG, compatibility/ecosystem/testing/brain guidance, and the native
compatibility website document the modes, evidence limits, known-config migration, and exact
recovery behavior. Corpus version 6 and the generated agent/CSP inventories match those changes. The
candidate contract requires completed diagnostics, release guidance, and quality review plus the
upgrade policy.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `bin/doctor/compatibility.json`, `schema/doctor-rules.schema.json`, and seven `test/doctor-contract.test.mjs` checks freeze reviewed ranges, diagnostic codes/remediation, expiry, and source digests; activation Plan validation preceded implementation.                                                                                                        |
| AC-02     | Pass   | `test/fixtures/doctor-consumer.mjs` executes 13 legacy contract groups through the installed bin: version/list/filter, init/copy, both dry runs, ownership/overwrite/force, dependency deduplication/no-deps/cycles, custom registry, path refusal, and registry doctor. `.git/jqstar/0032-installed-proof/report.json` binds their pass to the delivery tarball. |
| AC-03     | Pass   | `schema/doctor.schema.json`, `bin/doctor/data.mjs`, and deterministic/privacy tests in `test/doctor.test.mjs` validate closed bounded output and omit configuration canaries. The installed-rules failure control proves schema-valid null metadata and sanitized internal errors.                                                                                |
| AC-04     | Pass   | `test/doctor.test.mjs` checks human/JSON/quiet, warning, unknown, incompatible, malformed, and unsafe cases. The installed effects fixture checks internal-rule failure exits 2 with `JQS_INTERNAL_ERROR`; success and incompatibility exit 0 and 1.                                                                                                              |
| AC-05     | Pass   | `test/doctor.test.mjs` exercises npm 2/3, pnpm importers/stores, Yarn variants, local versus hoisted workspaces, duplicate versions, missing modules, exports/plugins/config/ownership, Node/tooling, and installed identity without evaluating modules.                                                                                                          |
| AC-06     | Pass   | The direct/lock/installed/unknown ecosystem test preserves four distinct evidence kinds. `docs/JQUERY_ECOSYSTEM.md` and `docs/UPGRADES.md` retain temporary opt-in Migrate and archived-runtime boundaries.                                                                                                                                                       |
| AC-07     | Pass   | The Migrate-summary schema and category/privacy tests permit only validated bounded categories. The upgrade guide documents staged temporary use; installed network/process/module canaries prohibit automatic collection or rewriting.                                                                                                                           |
| AC-08     | Pass   | `test/doctor-migrations.test.mjs` and the installed consumer compare full directory snapshots around deterministic plan creation. Plans identify hashes, paths, ordered operations, backup/journal, and the single known configuration target.                                                                                                                    |
| AC-09     | Pass   | Migration tests inject each commit-stage failure, target byte/identity/mode drift, symlinks, unsafe paths, concurrent writers, and interrupts. Exclusive backups, sibling replacement, file/directory flushes, mode preservation, and recovery paths retain original or recoverable state.                                                                        |
| AC-10     | Pass   | Migration unit/property and installed-bin tests prove apply, no-op reapply, exact-byte rollback, divergence refusal, bounded private journals, and no backup overwrite/deletion. Two 100-case properties pass.                                                                                                                                                    |
| AC-11     | Pass   | Adversarial metadata tests cover file/total-byte/importer/package/diagnostic/string/depth/deadline limits, workspace cycles, duplicate roots, invalid UTF-8, YAML aliases/tags, and directory exports. The guide documents checked deadlines and the OS-call boundary.                                                                                            |
| AC-12     | Pass   | `test/fixtures/doctor-effects-guard.mjs` positively detects blocked network, child-process, and write effects before the real CLI runs. Installed snapshots cover four lock layouts and planning, and a throwing `.pnp.cjs` remains unevaluated. Apply/rollback are explicit separate modes.                                                                      |
| AC-13     | Pass   | Installed package quality executes the packed bin and compatibility manifest across npm/pnpm/Yarn layouts; export/file/docs/API/type checks bind package 1.1.0. Portable drive/UNC/traversal refusal fixtures run on POSIX; this is not a claim of a Windows host execution.                                                                                      |
| AC-14     | Pass   | Delivery `2026-09-06T04-09-28-284Z-93807` passes all 13 gates. Focused installed legacy proof uses identical tarball SHA-256 `69dac90139e8b47bdd89749487b65085e863901f0c9c6def516036794d3e11a3`. The finalized closure additionally requires its own current receipt before commit; mutation remains deferred.                                                    |

### Completion audit

Offline package diagnostics and known-config migration satisfy every criterion. The installed
consumer proves legacy commands and all four lockfile layouts using the same artifact as delivery.
Recovery tests preserve exact bytes and report usable journal/backup paths. Remaining documented
limits are metadata inference, OS calls that cannot be interrupted by a checked deadline, and
uncooperative same-privilege writers. No application code is evaluated, no dependency or copied
recipe is rewritten, and no runtime entry imports the CLI parsers. The final closure gate includes
the maintained legacy fixture and expanded candidate prerequisite metadata.

Status: Complete

---
id: 0032
title: Add package upgrade diagnostics
status: planned
created: 2026-08-30
updated: 2026-09-01
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

- [ ] [AC-01] Activation freezes a dated compatibility-rule manifest and unique diagnostic registry
      for supported Node, jQuery, jQStar, entrypoint, plugin, config, and ecosystem ranges, with
      authoritative source, evidence inputs, severity, remediation, and review date; Plan validation
      passes before Code.
- [ ] [AC-02] Existing init/list/add/source-registry doctor behavior, path ownership, dry-run, and
      overwrite contracts remain compatible in exact installed-CLI regression fixtures.
- [ ] [AC-03] jqstar-doctor-report/1 JSON is schema-valid, deterministic, bounded, ANSI-free, and
      records code, severity, confidence/evidence kind, affected package/path, observed/expected,
      correction, and static documentation link without leaking configuration values.
- [ ] [AC-04] Exit 0/1/2 behavior is exact across human, JSON, quiet, warning-only, unknown,
      incompatibility, malformed input, unsafe path, and internal-failure cases; stable codes rather
      than prose are the automation contract.
- [ ] [AC-05] Recognized metadata detects compatible/incompatible package and jQuery peers,
      duplicate jQStar/jQuery resolution, Node/tooling ranges, obsolete entrypoints, config schema,
      plugin API, ownership, and installed artifact identity across npm, pnpm, Yarn, workspaces,
      hoisting, and absent node_modules fixtures without executing project or package code.
- [ ] [AC-06] jQuery UI, jQuery Mobile, and jQuery Migrate results distinguish direct dependency,
      transitive/lock presence, installed metadata, and unknown runtime use. The command never loads
      those runtimes and never presents a Migrate warning as an automatic safe rewrite.
- [ ] [AC-07] The opt-in Migrate guide and optional schema-validated summary import report bounded
      warning categories and migration links only; doctor performs no browser injection, collection,
      arbitrary log parsing, source rewrite, or warning suppression.
- [ ] [AC-08] Default config migration is a deterministic dry run with exact target, schema,
      before/after hashes, ordered operations, backup/recovery plan, and no filesystem mutation.
      Package/lock/source/registry/third-party files are unconditionally outside writable scope.
- [ ] [AC-09] Apply revalidates the before hash and path, rejects symlink/non-regular/out-of-bound
      targets, validates schemas, uses exclusive backup and atomic sibling replacement, preserves
      safe mode, and reports recoverable state for every injected failure boundary.
- [ ] [AC-10] Reapply is a no-op; rollback verifies hashes and atomically restores only an unchanged
      migration result. Journals/backups are bounded, permission-safe, never silently overwritten or
      deleted, and contain no secret config values in diagnostic output.
- [ ] [AC-11] File/workspace/package/diagnostic/string/depth/time budgets and cycle/duplicate-root
      handling stop adversarial projects deterministically with an explicit truncation/error result.
- [ ] [AC-12] Network, process-spawn, package-manager, lifecycle-script, module-execution,
      telemetry, Git-write, dependency-write, and publish canaries prove doctor is local and
      read-only except the separately authorized known-config apply/rollback operations.
- [ ] [AC-13] Tarball consumers execute the installed bin and installed compatibility manifest from
      npm/pnpm/Yarn-like fixture layouts, not repository scripts, and verify package/version
      identity, Windows/POSIX path behavior, declarations where applicable, and packaged
      documentation links.
- [ ] [AC-14] Focused, coverage/property/static/security, package/release, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

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

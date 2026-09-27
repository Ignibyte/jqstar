---
id: 0008
title: Install plugins transactionally
status: done
created: 2026-08-30
updated: 2026-09-08
---

# 0008: Install plugins transactionally

## Plan

### Problem

jQuery Star has global actions but no plugin identity, dependency, namespace, collision, rollback,
or disposal contract. A plugin that mutates registries incrementally can leave half-installed
behavior when a later registration fails.

### Current evidence

- `$.star.action()` writes directly to the kernel action registry and preserves overwrite-and-chain
  behavior for legacy 0.1 consumers.
- `createUI()` registers the built-in `ui.*` action set during root installation. Ticket 0013 owns
  its later conversion into a separately importable UI plugin.
- `Kernel.trackApplication()` commits an already constructed application, while both application
  implementations call `applicationDestroyed()` at the end of exhaustive teardown.
- The kernel owns document resources and expression-engine disposal, but has no plugin identity,
  dependency graph, application hook, plugin cleanup, or structural-install lock.
- The 0.1 public baseline explicitly records the plugin API as unpublished until this ticket.

### Scope

- Add typed plugin manifests with name, version, kernel API range, dependencies, and ordering.
- Stage every plugin registration and cleanup in an installation transaction.
- Validate names, reserved namespaces, duplicates, dependencies, API ranges, cycles, order, and the
  structural-install lock before atomic commit.
- Return a typed plugin facade from `use()` and return it for repeat use of the same plugin object.
- Accept an array in `use()` so a dependency graph can be validated, ordered, installed, or rolled
  back as one transaction.
- Treat another object with the same plugin name as a conflict without comparing options.
- Add kernel disposal and application setup/cleanup registration capabilities.
- Start with action and application-hook registrars. Later tickets add directives and protocol
  capabilities through the same transaction.

### Out of scope

- Live plugin uninstall.
- Runtime package download or plugin discovery.
- Plugin CLI scaffolding.
- Converting the built-in UI system into the ticket-0013 modular UI plugin.
- Directive, expression-helper, request, protocol, observation, or service registrars owned by
  tickets 0009–0012.

### Dependencies

- Tickets 0005 and 0006.

### Acceptance criteria

- [x] [AC-01] Public types define a stable plugin API version, manifest identity/version/API range,
      dependency ranges, before/after ordering, a staging registrar, application hooks, cleanup, and
      a typed facade.
- [x] [AC-02] `$.star.use(plugin)` and `$.star.use([plugins])` install a validated graph in
      deterministic topological order, publish every staged registration together, and return each
      typed facade.
- [x] [AC-03] A thrown installer, action collision, missing or incompatible dependency, API-range
      failure, dependency/order cycle, invalid reference, invalid manifest, or late installation
      leaves no action, hook, facade, namespace claim, or pending cleanup behind.
- [x] [AC-04] Reusing the same plugin object returns the same facade without rerunning its
      installer; a different object with the same name conflicts without comparing arbitrary
      options.
- [x] [AC-05] `core` and `ui` namespaces are reserved. Each external plugin owns its dot-qualified
      namespace, cannot overlap another plugin namespace, and can register actions only below it.
- [x] [AC-06] Structural plugin installation closes as soon as the first behavior or attribute
      application begins setup, including when that application later rolls back.
- [x] [AC-07] Application-hook setup is transactional before application commit. Application
      destruction runs hook cleanup once in reverse order, and kernel disposal destroys applications
      before running plugin cleanup once in reverse order while attempting all work.
- [x] [AC-08] Legacy `$.star.action()` keeps its 0.1 chaining and overwrite behavior outside an
      installed plugin namespace, and every existing built-in `ui.*` and backend action remains.
- [x] [AC-09] Before the still-uncommitted quality program establishes its first immutable baseline,
      the complete root artifacts fit measured next-1-KiB ceilings; the budget schema, ratchet, all
      unrelated ceilings, and post-baseline no-increase rule remain unchanged.

### Design

Publish `STAR_PLUGIN_API_VERSION`, `StarPlugin`, `StarPluginRegistrar`, and the hook/cleanup/facade
types. A manifest uses a dot-qualified plugin name, stable SemVer version, a supported stable SemVer
range for `apiVersion`, dependency name-to-range records, optional `before`/`after` names, and one
synchronous installer. Supported ranges are explicit: wildcard, exact, caret, tilde, and whitespace
joined comparison sets. Prerelease/build and disjunction syntax are rejected rather than partially
interpreted.

The installer receives a staging registrar, never the mutable kernel. It may stage namespaced
actions, application hooks, and cleanup callbacks, then return its facade. Single-plugin `use()` is
the typed common path; array `use()` validates and topologically orders a complete graph. Installed
dependencies are fixed before candidates, while a candidate cannot claim it belongs before an
already installed plugin. Ties preserve request order.

The action registry prepares a replacement snapshot containing every namespace claim and action. The
plugin host commits that snapshot together with its plugin and hook snapshot only after every
installer succeeds. Failure runs staged cleanup in reverse order and publishes none of those
snapshots. A plugin facade may close over plugin state but cannot expose the kernel.

The first application identity allocation closes structural installation. After application
construction, `Kernel.trackApplication()` runs committed plugin hooks before recording the
application. Hook failure runs earlier hook cleanups, then the existing application commit rollback
destroys the untracked application. The kernel record owns successful hook cleanups so explicit
destroy, patch removal, and kernel disposal share the same exact-once path.

Keep `ui` reserved without converting the current built-in UI setup into a public plugin. Ticket
0013 owns that modular boundary. Legacy actions can still overwrite other legacy actions, but cannot
write into a namespace after a plugin claims it.

### Decisions

- Use object identity for repeat installation. Plugin factories may close over arbitrary options;
  jQStar neither serializes nor compares those options.
- Keep installation synchronous. Runtime package loading, asynchronous discovery, and live uninstall
  remain out of scope.
- Validate complete candidate graphs before invoking installers, then invoke them in stable
  topological order. A missing dependency is not fetched automatically.
- Bound version support to stable three-part SemVer and the documented range forms so the browser
  runtime does not ship a package-manager resolver or silently accept syntax it cannot honor.
- Reserve both the exact `core`/`ui` names and their descendant namespaces. Reject overlapping
  external namespace claims such as `acme.tools` and `acme.tools.audit`.
- Run application hook cleanup before kernel-level plugin cleanup. Run both in reverse registration
  order and aggregate failures after attempting every callback.
- Treat the current size configuration as the quality program's not-yet-committed first baseline,
  not an already published release ceiling. Ticket 0008 may move only the UMD and installed-root
  ceilings to the next 1 KiB boundary above measured plugin artifacts. The immutable-base ratchet
  remains unchanged and will reject later increases after the quality program is committed.

### Risks

- Dependency ranges need deterministic semver handling without turning install into package-manager
  resolution. Reject unsupported range syntax with the offending plugin/dependency in the error.
- Built-in UI registration may expose hidden collisions. Record and reserve its namespace first.
- An installer can perform an arbitrary side effect before registering cleanup. The contract can
  only roll back work represented through `registrar.cleanup()`; document that requirement.
- Calling plugin hooks after an application is constructed creates a second commit boundary. Keep
  the hook stage inside `trackApplication()` so the existing outer runtime transaction destroys the
  application when a hook fails.
- The root auto-install entry cannot tree-shake the plugin host before ticket 0013. Record exact raw
  growth and use the documented next-1-KiB rule; do not create headroom in package, ESM, CSS,
  browser-operation, or generated-output budgets.

### Verification plan

- Test public single and batch installation, stable ordering, dependency/API ranges, every manifest
  and namespace rejection, partial installer failure, dependency and ordering cycles, late
  installation, identity conflicts, and facade reuse.
- Test application-hook setup/rollback for both application modes, explicit and patch-driven
  destruction, kernel disposal, reverse order, exact-once cleanup, and aggregated failures.
- Add property tests for stable version-range boundaries and generated acyclic/cyclic graphs.
- Verify the reviewed public baseline/API report and installed ESM, CommonJS, QUnit, NodeNext, and
  Bundler consumers.
- Run focused tests, `npm run quality:fast`, coverage, package quality, browser quality, and final
  `npm run quality:delivery` without mutation testing.

### Planned files

- `src/plugin.ts`: Public manifest/registrar types, stable range validation, graph planning,
  transactional staging, facade identity, structural lock, hooks, and disposal.
- `src/registry.ts`: Atomic plugin namespace/action snapshot preparation while retaining legacy
  action behavior.
- `src/kernel.ts`, `src/runtime.ts`: Plugin host ownership, public `use()`, application hook commit,
  structural lock, and cleanup ordering.
- `src/types.ts`, `src/index.ts`: Publish `StarStatic.use`, plugin API version, and plugin types.
- `test/plugin.test.ts`, `test/registry.test.ts`, `test/kernel.test.ts`, `test/runtime.test.ts`,
  `test/declarative.test.ts`: Transaction, identity, lifecycle, legacy, and rollback proof.
- `test/property/plugin.property.test.ts`: Generated stable-range and dependency/order graph proof.
- `test/public-baseline.test.ts`, `quality/public-baseline.json`, `etc/jquery-star.api.md`: Review
  the new public contract.
- `schema/public-baseline.schema.json`: Move the exact baseline policy from unpublished to plugin
  API 0.1.0.
- `schema/package-report.schema.json`, `test/package-release-hardening.test.mjs`: Remove the
  delivered external-plugin contract from the exact future-contract label while retaining
  ticket-0014 testing.
- `scripts/quality-package.mjs`: Resolve and exercise plugin values and declarations from installed
  consumers.
- `config/quality-budgets.json`, `docs/QUALITY_PROGRAM.md`: Record the measured first-baseline UMD
  and installed-root ceilings without weakening the immutable ratchet.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/RUNTIME_OWNERSHIP.md`,
  `docs/TESTING.md`: Public use, namespace/version policy, ownership, transaction, and test
  contract.
- `docs/tickets/0008-install-plugins-transactionally.md`: Phase, file, command, inspection, and
  acceptance evidence.

### Reopened ownership correction (2026-09-08)

Current public-core probes at commit `c5269db` contradict the prior closure. An activation that
calls `$.star.dispose()` still returns a published facade and skips its registered cleanup. An
application hook that disposes the kernel permits later hooks and application commit. Destroying
only the application also permits later setup callbacks. A staged `documentHost.own()` resource
receives no cleanup when its installer throws before activation. Exact source identities and
observations live under `.git/jqstar/program-audit/ownership-census/resume-2026-09-08/` in
`before.json` and `plugin-boundaries-before.json`. The initial probe's incorrect installer return
shape was corrected to use `.star` before collecting these results.

Reopen AC-02, AC-03 and AC-07. The previous evidence remains historical. Recheck the structural
installation lock after every installer and activation, retaining returned cleanup before refusal.
Stop application hooks after application destruction or host disposal, release returned and earlier
cleanup in reverse order, and prevent the kernel from committing the interrupted application.
Register staged-resource cancellation when the resource is declared, covering installer failure,
preparation failure, explicit cancellation, activation failure and terminal disposal. Preserve
exactly-once release and aggregate failures while attempting every registered cleanup. A resource
that cannot acquire kernel ownership must release its provisional listener/observer or cleanup.

The correction changes `src/plugin.ts` and `src/kernel.ts`, focused plugin/public runtime tests in
`test/plugin-lifecycle.test.ts` , this ticket, `README.md`, `docs/ARCHITECTURE.md`,
`docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md`. The generated
`test/fixtures/csp/conformance-map.json` tracks shifted README locations. Generated agent content is
refreshed only if its selected public inputs change. The size budgets remain fixed; measure the
actual installed core/CSP graphs and artifacts. Additional compact implementation changes require
recorded evidence of equivalent behavior before adoption.

Verify actual public installation and application setup, both interruption kinds, reverse cleanup,
throwing cleanup, staged resource cancellation and unchanged successful controls. Negative controls
must fail against the original source. Run focused tests, `npm run quality:fast`, exact Code
validation, changed-code coverage and `npm run check` before Test/Document closure. Preserve all
failed reports. This changes no API, async-install policy, public namespace or authorization
boundary.

### Interrupted application guard consolidation

The first corrected consumer preview measures core gzip at 62,901 bytes and CSP Brotli at 39,099
bytes against unchanged 63,000/39,000 limits. The new per-hook refusal makes the kernel's post-hook
destruction branch redundant. Move its responsibility into one plugin-host application lifetime
check before the first hook and after each returned cleanup. The existing kernel catch still
releases observation, middleware and protocol links after hook rollback. Add an already terminated
application control, retain the existing kernel cleanup assertions, and verify both application
modes. This consolidation must preserve failure cleanup and rejection, not remove a lifetime check
to fit the budget. The Mobile reference UMD byte measurement is refreshed from the actual generated
UMD in `quality/jquery-mobile-migration.json`; no ceiling changes.

The release-slot simplification preserves immediate cancellation and reduces the preview to 39,051
CSP Brotli bytes, still above the unchanged ceiling. The host's three private disposal maps can be
cleared after exhaustive release instead of replaced before callbacks: the disposed flag already
prevents any installation from observing or mutating them, and no public reader exposes these maps.
Retain the existing observer/middleware/profile disposal and recursive-disposal controls, and verify
that throwing cleanup still clears all maps. This removes redundant private aliases without changing
registry ownership or callback order.

Current previews still exceed the CSP ceiling. Source inspection finds `applicationHooks` only in
private `InstalledPlugin` records and local variables in `src/plugin.ts`. The existing property
minification contract deliberately accepts only private class members, so the record key is outside
that mechanism. Leave its allowlist/test unchanged. Use the internal record fields `hooks`,
`profiles` and `middleware` while retaining the public registrar, manifest and hook API names.
Installed external-plugin conformance, API reports and both consumer graphs must pass. Adjacent
identity/cleanup commit loops are consolidated without changing callback order.

### Unified installed cleanup ownership

The smaller record keys and lifetime helper preserve focused behavior but still exceed the CSP
Brotli ceiling. Consolidate the installed operation, middleware and protocol releases into each
plugin's existing cleanup stack. Append them in reverse protocol/middleware/operation order so
terminal reverse iteration preserves the previous operation/middleware/protocol ordering before
installer cleanup. Remove the three duplicate private maps and their commit/disposal loops. Consume
each cleanup stack before invoking its callbacks so the retained plugin identity record cannot
retain released operation, middleware or protocol closures after disposal. Failed preparation still
rolls back through its existing prepared records, and staged installer cleanup remains separate
until commit. This uses one owned stack for installed plugin releases without changing exact-once
cleanup, aggregation, resource categories or public metadata. Verify current
observer/middleware/profile disposal, failed batches, recursive disposal and external-plugin
conformance before acceptance.

## Code

### Changed-file ledger

| File/group                                                                     | Purpose                                                                 |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/plugin.ts`, `src/registry.ts`                                             | Transactional plugin graph, lifecycle, version, namespace, and actions. |
| `src/kernel.ts`, `src/runtime.ts`                                              | Kernel ownership, application hooks, lock, cleanup, and public use.     |
| `src/types.ts`, `src/index.ts`                                                 | Public static member, values, and plugin declaration exports.           |
| `test/{plugin,registry,kernel,runtime-install}.test.ts`                        | Installation, collision, identity, application, rollback, and cleanup.  |
| `test/property/plugin.property.test.ts`                                        | Generated version-range and graph invariants.                           |
| `test/public-baseline.test.ts`, `quality/public-baseline.json`                 | Reviewed 0.x public surface.                                            |
| `schema/public-baseline.schema.json`                                           | Exact published plugin-policy schema transition.                        |
| `schema/package-report.schema.json`, `test/package-release-hardening.test.mjs` | Exact package future-contract transition after plugin delivery.         |
| `scripts/quality-package.mjs`, `etc/jquery-star.api.md`                        | Installed-consumer and declaration-report proof.                        |
| `config/quality-budgets.json`, `docs/QUALITY_PROGRAM.md`                       | Measured first-baseline root artifact ceilings and policy.              |
| `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`        | Public policy, lifecycle, ownership, and conformance documentation.     |
| `docs/tickets/0008-install-plugins-transactionally.md`                         | Current phase, files, commands, findings, and acceptance evidence.      |

### Current correction ledger

| File                                                   | Purpose                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/plugin.ts`, `src/kernel.ts`                       | Recheck interrupted installation/application setup and own staged rollback. |
| `test/plugin-lifecycle.test.ts`                        | Public lifecycle probes and provisional observer failure proof.             |
| `quality/jquery-mobile-migration.json`                 | Refresh the actual generated UMD measurement, without changing ceilings.    |
| `docs/tickets/0008-install-plugins-transactionally.md` | Reopening, plan and verification record.                                    |

### Design changes

The current correction follows the Plan's shared application guard and consumed installed cleanup
stack. No changes beyond those recorded decisions. The following first-baseline size decisions are
historical and do not change the current ceilings.

The implementation follows the validated transaction and lifecycle design. Installed-package quality
measured the final minified UMD at 402,320 bytes and the installed root-import consumer at 481,635
bytes. Because tickets 0041–0044 remain uncommitted and the budget ratchet still reports its
first-baseline state, set only those two ceilings to their next 1 KiB boundaries: 402,432 and
482,304 bytes. The immutable comparison rule and every unrelated ceiling remain unchanged.

## Test

| Current command                                                                                                                                                              | Result | Evidence                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                                                                                                              | Pass   | `2026-09-08T14-15-52-232Z-38476/report.json`: all 13 gates, 1,722 unit tests, every changed executable line/function, 487 browser cases, all package/release/detector checks; unchanged 862-file fingerprint. |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0008-install-plugins-transactionally.md --report .git/jqstar/runs/2026-09-08T14-15-52-232Z-38476/report.json` | Pass   | Executed against the exact current receipt before Document changes.                                                                                                                                           |

Earlier verification and failures remain below.

Integrated fast `2026-09-08T13-40-13-597Z-23188` passes all six gates and 1,687 unit tests after the
store correction and installed CSP pin fix. Actual Code validation accepts the exact report for
owners 0008, 0018 and 0035. Fresh complete delivery remains required.

Delivery `2026-09-08T13-13-33-365Z-48105` finishes with matching fingerprint
`f9d36b870cad2f88eb488b71fd750ec2f8b6ab844836da9524d68cf7c78e98eb`. Eleven of thirteen gates pass:
all 1,659 unit tests, 487 browser cases, 53 changed executable lines and twelve changed functions,
seven release checks and fixed package size budgets. The installed browser digest assertion retains
one old CSP literal, causing both the package gate and its exact detector baseline to fail. Owner
0035 corrects that assertion. This run authorizes no delivery receipt or phase closure.

| Command                                            | Result | Evidence                                                                                                                                                         |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` (2026-09-08 pin correction) | Pass   | `2026-09-08T13-11-08-222Z-35005/report.json`: all six gates, 1,659 unit tests and unchanged source fingerprint.                                                  |
| Exact Code phase validation                        | Pass   | Validator accepts that exact fast report before this ticket enters testing.                                                                                      |
| Expanded focused lifecycle suites                  | Pass   | `ownership-census/resume-2026-09-08/plugin-expanded-focused.log`: 144 cases across seven suites.                                                                 |
| Public-core interruption probes                    | Pass   | `plugin-boundaries-after.json`: later hooks are absent and returned/provisional cleanup runs; `after-plugin.json` retains the separate unresolved store finding. |
| CSP inventory review                               | Pass   | `csp-location-review.json`: only 28 README locations change; all other conformance fields and all four corpora are identical to HEAD.                            |

Corrected fast run `2026-09-08T13-06-59-139Z-21725` passes formatting, workflow, all static gates
and 1,658 unit tests. Its sole failure is the aggregate CSP identity pin after the README location
inventory refresh. Owner 0035 records the mechanical map/digest/API-test refresh before changes; no
grammar or corpus behavior changes. The passing expanded focused run contains 144 cases. Current
built-consumer previews measure core gzip at 62,772 and CSP Brotli at 38,989 bytes. These previews
do not replace the installed-package gate.

Fast run `2026-09-08T13-01-17-079Z-7814` fails formatting, unit and static verification. It passes
1,652 unit tests; six lifecycle assertions require the original destroyed-application diagnostic and
one CSP contract assertion rejects stale README line references. Restore the original diagnostic in
the consolidated plugin-host check, regenerate the CSP inventory after formatting, and repeat the
full fast gate. The original report and seven failing assertions remain retained. Static
verification also rejects an unavailable public type alias and a cancellation branch narrowed
incorrectly across a reentrant callback. Infer the facade type from the public installer and read
cancellation through a closure before acquisition. The existing negative/positive cancellation
control proves why the later check is required. No lint allowance changes.

The 2026-09-08 Plan validation passes before source edits. The original source fails ten of twelve
new public lifecycle cases; installer disposal and post-activation rollback controls already pass.
`ownership-census/resume-2026-09-08/plugin-negative.json` retains every assertion and diagnostic.
The application-data assertion now uses the actual `jqueryStar.instance` key from the source.
Current focused, fast and full delivery verification remain required.

| Command                                                               | Result                      | Evidence                                                                                                                                                                               |
| --------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan validation                                                       | Pass                        | The expanded manifest, transaction, graph, lifecycle, namespace, version, risk, and file contracts closed Plan before source edits.                                                    |
| Focused plugin, registry, kernel, runtime-install, and property tests | Pass                        | Seventy-five tests covered transactional installation, public integration, both application modes, cleanup ownership, stable ranges, and generated graphs.                             |
| First `npm run test:unit`                                             | Expected public review stop | 556 of 558 tests passed. The exact baseline and API Extractor rejected the newly added plugin value, types, and `StarStatic.use` until explicit review.                                |
| Final `npm run test:unit`                                             | Pass                        | The reviewed plugin value, five types, static member, jQuery augmentation, and every existing runtime/component test passed.                                                           |
| First `npm run test:package:quality`                                  | Fail, retained              | Eleven checks passed. Only the old UMD and installed-root ceilings failed at 401,898 and 481,213 bytes.                                                                                |
| First Code-phase `npm run quality:fast`                               | Fail, corrected             | Unit/API review found the generic custom-state action signature; schema validation found the old exact “plugin API unpublished” constant. Both review stops were corrected explicitly. |
| Final Code-phase `npm run quality:fast`                               | Pass                        | Run `2026-09-01T05-59-56-230Z-10971` passed workflow, runner self-tests, formatting, 560 unit tests, and all 22 fast static checks on one unchanged tree.                              |
| Code-phase ticket validation                                          | Pass                        | The ticket validator accepted the exact green fast report before the ticket moved to `testing`.                                                                                        |
| First `npm run test:coverage`                                         | Fail, retained              | The artifact census passed; the changed-line gate found 25 unexecuted invalid-input, comparator, registrar, tracking, asynchronous-installer, and empty-batch branches.                |
| Final `npm run test:coverage`                                         | Pass                        | All changed executable lines/functions are covered; `src/plugin.ts`, `src/kernel.ts`, and `src/registry.ts` report 100% lines, with the 275-artifact census intact.                    |
| `npm run test:property`                                               | Pass                        | Fourteen tests with seed 430043 passed generated caret boundaries, acyclic dependency order, cyclic rollback, and existing runtime/SSE properties.                                     |
| Final `npm run test:package:quality`                                  | Pass                        | All 13 installed-consumer and browser checks passed; final UMD is 402,320/402,432 bytes and the Vite root consumer is 481,635/482,304 bytes.                                           |
| First `npm run quality:static:delivery`                               | Fail, corrected             | Twenty-six of 28 checks passed. Plain wording and the exact `pluginApi` value `0.1.0` fixed spelling and secret-scanner failures without exceptions or allowlists.                     |
| Final `npm run quality:static:delivery`                               | Pass                        | All 28 delivery-static checks passed without a spelling exception, scanner allowlist, dependency change, or suppressed finding.                                                        |
| First `npm run quality:delivery`                                      | Error, retained             | Eleven substantive gates passed. The parent validator found an obsolete package-schema future-contract label after the external plugin contract shipped.                               |
| Final Test-phase `npm run quality:delivery`                           | Pass                        | Run `2026-09-01T06-17-20-471Z-48385` passed all 12 substantive gates on one unchanged tree.                                                                                            |
| Test-phase ticket validation                                          | Pass                        | The validator accepted that exact report while the ticket was in `testing`; an independent check found zero abandoned `jqstar-release-quality-*` directories.                          |

### Inspection ledger

Current correction inspection confirms that the shared application guard runs before the first hook
and after retaining every returned cleanup. Kernel failure still releases its observation,
middleware and protocol application links. Installed cleanup stacks preserve the former category
order and are consumed before callbacks. Resource cancellation covers both provisional cleanup and
an acquisition that finishes during cancellation. Existing private-property rules and every size
ceiling remain unchanged. Complete delivery is pending.

| Finding                                                                                    | Resolution                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The baseline schema and policy still described the plugin API as unpublished.              | Reviewed the new value, five types, `StarStatic.use`, jQuery augmentation, baseline list, API report, and exact policy schema together.                                               |
| A plugin installer could call `use()` while another installation was staging.              | Added an installation guard; the inner call fails and the outer registrar cleanup rolls back without publishing either namespace.                                                     |
| A same-object repeat could fail after user code mutated its readonly manifest fields.      | Resolve committed object identity before revalidating manifest fields and retain immutable installed name/version snapshots for dependency checks.                                    |
| A hook can throw, return invalid cleanup, or destroy its application before kernel commit. | Hook setup rolls back earlier cleanups; `trackApplication()` rejects destroyed instances and the outer runtime transaction leaves no data or application record.                      |
| The root auto-install build grew beyond two pre-commit first-baseline ceilings.            | Retained the failing package report, measured 401,898-byte UMD and 481,213-byte consumer artifacts, and used only their next-1-KiB boundaries while preserving the immutable ratchet. |
| The built-in UI action set is not yet a plugin but owns `ui.*`.                            | Reserve exact `ui`/`core` roots and descendants now; ticket 0013 still owns the modular UI conversion.                                                                                |

## Document

### Documentation changed

- `README.md` documents single and batch installation, typed facades, graph order, supported stable
  version ranges, namespace ownership, rollback, lifecycle cleanup, and current limitations.
- `docs/ARCHITECTURE.md` records the validation, staging, atomic registry-snapshot commit,
  application-hook commit, structural-lock, and reverse-cleanup boundaries.
- `docs/RUNTIME_OWNERSHIP.md` assigns the plugin host, facade snapshots, hooks, application
  cleanups, and plugin cleanups to one kernel and specifies their disposal order.
- `docs/TESTING.md` defines plugin transaction conformance across unit, property, package, browser,
  coverage, and delivery checks.
- `docs/PROJECT.md` adds the public plugin API and its current registrar capabilities and preserves
  the ticket-0013 boundary for modular UI extraction.
- `docs/QUALITY_PROGRAM.md` records the measured UMD and installed-root first-baseline ceilings and
  preserves the immutable post-baseline no-increase rule.
- `quality/public-baseline.json` and `etc/jquery-star.api.md` record the reviewed plugin value,
  public types, `StarStatic.use` overloads, and jQuery augmentation.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                            | Result |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `src/plugin.ts`, `src/types.ts`, and `src/index.ts` publish API version `0.1.0`, stable manifest and graph fields, a staging registrar, application hooks, cleanup, and generic typed facades.                                                                                      | Pass   |
| AC-02 | Plugin installation, property and installed-consumer tests cover graph order and atomic publication. `test/plugin-lifecycle.test.ts` additionally refuses publication after installer/activation disposal and releases staged ownership; current full delivery passes.              | Pass   |
| AC-03 | Existing validation/rollback tests plus the 17-case `test/plugin-lifecycle.test.ts` cover provisional resources, failed ownership, cancellation during acquisition and returned cleanup failures. Current changed-code coverage and full delivery pass with fixed size/lint limits. | Pass   |
| AC-04 | Object-identity tests prove a repeated object returns the same facade without reinstalling—even after manifest mutation—while another object with the same name conflicts before option comparison.                                                                                 | Pass   |
| AC-05 | Registry and plugin tests prove exact and descendant `core`/`ui` reservation, dot-qualified external names, namespace-overlap rejection, action confinement, and post-claim legacy-write rejection.                                                                                 | Pass   |
| AC-06 | Behavior and attribute application tests prove the structural lock closes at the first identity allocation and remains closed after application setup rollback.                                                                                                                     | Pass   |
| AC-07 | Hook interruption cases prove stopped later hooks, refused application commit and exact cleanup after application/kernel disposal. Reentrant staged cancellation and reverse installed cleanup are covered; all current lifecycle/browser gates pass.                               | Pass   |
| AC-08 | Registry, public-baseline, package, release, and browser suites retain legacy chaining and overwrite behavior outside plugin claims and exercise the existing built-in `ui.*` and backend action surface.                                                                           | Pass   |
| AC-09 | Package quality measured 402,320-byte UMD and 481,635-byte root-consumer artifacts below exact 402,432 and 482,304 ceilings; schema validation and the immutable-base ratchet preserve every unrelated and future constraint.                                                       | Pass   |

### Historical completion audit

The changed-file ledger matches the implemented transactional plugin host. Focused tests,
changed-line coverage, generated graph and stable-range properties, installed consumers, reviewed
API declarations, static analysis, self-hosting, all browser projects, release reproducibility, and
the ticket workflow pass. The Test-phase delivery run passed every substantive gate and left zero
owned temporary release workspaces. Public and project-brain documentation describe the shipped
manifest, graph, transaction, namespace, lifecycle, ownership, cleanup, compatibility, package-size,
and ticket-0013 modular-UI boundary.

Status: Historical

### Completion audit

The reopened plugin criteria have current implementation, direct regression evidence and matching
public/brain documentation. All 17 added lifecycle cases and the existing plugin/application
contracts pass in full delivery `2026-09-08T14-15-52-232Z-38476`. It passes all 13 gates and every
changed executable line/function on fingerprint
`94a419d86cec0fc16bb5f8ec6203fc1fd7aef6fd997ba34c6e8fd290b0d7994d` across 862 files. Actual Test
validation accepts that report and receipt before these Document updates. Provisional resource
handoff, interruption checks and consumed reverse cleanup preserve public diagnostics, API behavior
and the existing package/lint/coverage limits. The earlier failed runs remain recorded. No required
work remains for this owner correction; the separate program audit continues.

Status: Complete

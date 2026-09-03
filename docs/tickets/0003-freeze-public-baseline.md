---
id: 0003
title: Freeze the public 0.1 baseline
status: done
created: 2026-08-30
updated: 2026-08-31
---

# 0003: Freeze the public 0.1 baseline

## Plan

### Problem

The expansion program promises compatibility without an executable record of the current root API,
side effects, request bytes, event payloads, supported environments, or package formats. Current
documentation also claims some behavior, such as exported reactive effects, that must be checked
against the built package rather than assumed.

### Current evidence

- `src/index.ts` auto-installs into imported jQuery and exposes 15 root runtime exports.
- `src/types.ts` defines the current `JQuery.star`, `JQueryStatic.star`, `StarStatic`, application,
  backend, and component declarations. API Extractor records them in `etc/jquery-star.api.md`.
- `src/declarative.ts` implements 13 directive families, 11 event modifiers, signal/computed
  loading, lifecycle actions, and the `$`, `$name`, `el`, `evt`, `this`, and `action` expression
  scope.
- `src/fetch.ts` implements five backend actions, Datastar request encoding, fetch lifecycle events,
  retry, cancellation, HTML/JSON/SSE response handling, and patch events.
- `package.json` requires jQuery 4 and Node 24 and exposes the root plus `ui.css`; ticket 0044 now
  proves the packed root in ESM, CommonJS, UMD, TypeScript, QUnit, self-hosted, and three-browser
  consumers.
- Run `2026-08-31T15-21-08-168Z-69566` records the current 261-file tarball, root/CSS exports,
  bundle sizes, browser versions, declarations, API report, and reproducible release checksum.
- No single machine-readable file classifies the observed surface as stable, deprecated, or
  internal, and the existing tests do not fail when a public name silently leaves that inventory.

### Scope

- Inventory runtime exports, declarations, jQuery augmentations, attributes, action names, event
  names and payloads, errors, request bytes, response behavior, root side effects, UMD globals, and
  package files.
- Add executable semantic fixtures for behavior that later tickets promise to preserve.
- Record uncompressed and compressed bundle baselines.
- Decide jQuery, browser, Node-for-consumers, ESM, CommonJS, UMD, CDN, no-build, and document-host
  support for 0.x and 1.0.
- Resolve documentation claims that disagree with the built package.
- Define deprecation notice length, error-code stability, and plugin API versioning policy.
- Classify every inventoried item as stable for 0.x, deprecated, or internal. An observation is not
  a compatibility promise until the baseline gives it one of those dispositions.

### Out of scope

- Refactoring the runtime, changing request behavior, or adding package entry points.
- Promising jQuery 3.7 or additional browsers without passing evidence.

### Dependencies

- Ticket 0041.

### Acceptance criteria

- [x] [AC-01] A machine-readable public-surface fixture covers root exports, declarations, global
      jQuery members, auto-install side effects, and UMD global behavior.
- [x] [AC-02] Request fixtures record method, URL, query, headers, body, credentials, retry,
      cancellation, and Datastar lifecycle behavior for every backend action.
- [x] [AC-03] Event fixtures record names, targets, ordering, cancelability, and payload shapes.
- [x] [AC-04] Declarative attribute and expression-scope fixtures cover every documented built-in.
- [x] [AC-05] Current package contents and compressed/uncompressed bundle sizes are recorded by
      command.
- [x] [AC-06] The supported jQuery, browser, Node, module-format, CDN, and document topology is
      decided and documented with evidence or an explicit unsupported statement.
- [x] [AC-07] Documentation and built-package disagreements are resolved.
- [x] [AC-08] Every inventoried item is classified as stable for 0.x, deprecated, or internal, and
      policy defines deprecation notice length, error-code stability, and plugin API versioning.

### Design

Use semantic assertions rather than full generated-file snapshots. Baselines should fail when a
consumer-observable value changes but tolerate harmless formatting and source-map changes. Store
size budgets as measured baselines plus a documented regression rule, not an arbitrary target.

Keep one hand-authored `jqstar-public-baseline/1` manifest as the compatibility index. Executable
tests compare its names and values with the runtime, packed-package reports, API Extractor report,
and focused semantic fixtures. The manifest points to behavior tests; it does not duplicate their
implementation or replace package-quality reports.

Treat component APIs and DOM events already exposed through `$.star.ui` as stable for 0.x. Treat
source-only modules and undeclared package subpaths as internal. There are no deprecated items in
0.1; future deprecation must name the replacement and first release carrying the notice.

### Decisions

- Stable for 0.x means no removal or incompatible semantic change in a later 0.x release without a
  documented deprecation period. It does not yet claim 1.0 stability.
- The root import remains intentionally side-effectful: it installs into its imported jQuery
  instance. The planned `core` entry point is not part of this baseline.
- Browser support is Chromium, Firefox, and WebKit as exercised by Playwright. The support claim is
  behavior-based rather than tied to browser brand version ranges.
- jQuery `>=4.0.0 <5`, Node `>=24` for Node consumers and tooling, ESM, CommonJS, UMD/CDN script
  tags, browser modules, and ordinary full HTML documents are supported. Shadow DOM and frames are
  unsupported document topologies in 0.1.
- Public runtime errors have stable message intent but no stable error codes in 0.1 because the
  runtime does not expose codes.
- A stable item must be deprecated for at least one minor release before removal. Plugin API
  versioning begins with ticket 0008; private source imports receive no compatibility promise.

### Risks

- Freezing accidental behavior can make later cleanup difficult. Label each observed behavior as
  stable, deprecated, or internal before turning it into a compatibility promise.
- Environment decisions made without a real consumer can be wrong. Ticket 0004 supplies that proof.

### Planned files

- `quality/public-baseline.json`: Versioned stable, deprecated, and internal compatibility index.
- `schema/public-baseline.schema.json`: Fail-closed shape and classification rules.
- `src/registry.ts`: Expose a repository-internal action census without adding a package export.
- `test/public-baseline.test.ts`: Runtime, declaration, directive, action, event, request, package,
  environment, and classification contract checks.
- `test/fetch.test.ts`: Fill any missing semantic request/event cases identified by the inventory.
- `test/declarative.test.ts`: Fill any missing built-in directive or expression-scope cases.
- `package.json`: Expose a focused baseline verification command.
- `config/quality-budgets.json`: Ratchet the changed shipped artifact to the next 4-KiB boundary.
- `scripts/quality/validate-json.mjs`: Validate the public baseline against its schema.
- `README.md`: Publish the supported environments and compatibility promise.
- `docs/PROJECT.md`: Record stability, deprecation, error, and plugin-versioning policy.
- `docs/BACKEND.md`: Reconcile the request and lifecycle-event contract with executable fixtures.
- `docs/COMPONENT_ARCHITECTURE.md`: Reconcile declarative attributes and public component events.
- `docs/tickets/0003-freeze-public-baseline.md`: Maintain Plan → Code → Test → Document evidence.

### Verification plan

- Run focused runtime, declarative, fetch, package, and type-consumer fixtures.
- Run `npm run check`, `npm run test:package`, and `git diff --check`.

## Code

### Changed-file ledger

| File                                          | Purpose                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `quality/public-baseline.json`                | Exact 0.1 compatibility inventory, classifications, and measurements.     |
| `schema/public-baseline.schema.json`          | Fail-closed structure for the compatibility inventory.                    |
| `src/registry.ts`                             | Repository-internal exact registered-action census.                       |
| `test/public-baseline.test.ts`                | Root, type, jQuery, UI, action, directive, package, and policy checks.    |
| `test/fetch.test.ts`                          | Five-method request-byte, lifecycle-order, and unknown-SSE fixtures.      |
| `scripts/quality/validate-json.mjs`           | Public-baseline schema enrollment.                                        |
| `package.json`                                | Focused `test:public-baseline` command.                                   |
| `config/quality-budgets.json`                 | Next-4-KiB unpacked-artifact ceiling for the new shipped schema and docs. |
| `README.md`                                   | Public support matrix and 0.x compatibility policy.                       |
| `docs/PROJECT.md`                             | Corrected export claim and project-brain compatibility policy.            |
| `docs/BACKEND.md`                             | Stable request bytes and client lifecycle events.                         |
| `docs/COMPONENT_ARCHITECTURE.md`              | Component/action/event stability boundary.                                |
| `docs/tickets/0003-freeze-public-baseline.md` | Plan, implementation, tests, inspection, and completion evidence.         |

### Design changes

The compatibility index is hand-authored and schema-validated. It records names and measured values,
while semantic behavior remains in focused tests and installed-package reports. This avoids
format-sensitive snapshots and makes a public removal, addition, or support-claim change an explicit
review event.

`registeredActionNames` is exported only from the private source module so the test can compare the
complete registry with the manifest. It is not re-exported from `src/index.ts` and therefore does
not add a package API.

The shipped README and new public schema increased the built tarball to 262 files, 1,855,069 packed
bytes, and 6,078,819 unpacked bytes. The packed and file ceilings did not move. The unpacked ceiling
uses the existing next-4-KiB rule and moved to 6,082,560 bytes.

## Test

| Command                                  | Result               | Evidence                                                                                                                           |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| First `npm run test:public-baseline`     | Expected repair fail | The new suite exposed an invalid `fileURLToPath(import.meta.url)` assumption under Vitest after 36 existing behavior tests passed. |
| Repaired `npm run test:public-baseline`  | Pass, 41 tests       | Five baseline checks plus 36 declarative, request, and runtime semantic tests passed.                                              |
| `node scripts/quality/validate-json.mjs` | Pass                 | Forty-two JSON files parsed; four instances and fifteen schemas validated.                                                         |
| `npm run typecheck`                      | Pass                 | Production and registry TypeScript projects accepted the baseline test and internal action census.                                 |
| First `npm run test:package:quality`     | Expected repair fail | The built declaration added 593 bytes beyond the dry-run estimate; the gate rejected the provisional unpacked ceiling.             |
| Repaired `npm run test:package:quality`  | Pass, 13 checks      | The installed 262-file tarball passed API, format, type, browser, QUnit, bundle, contents, and registry checks.                    |
| `npm run test:release:quality`           | Pass, 7 checks       | Two independent clean installs reproduced SHA-256 `cc7e9bd237b6d935d8471c0e2787fc775b49e97f06cec3fa2da4c0ba74516f2a`.              |
| Fast-gate constituent run                | Expected repair fail | Runner sabotage, formatting, and all 403 unit tests passed; static isolated one unused local after running all 22 checks.          |
| Repaired `npm run quality:static`        | Pass, 22 gates       | The complete fast static, architecture, security, source, style, schema, and documentation stack passed.                           |
| `npm run quality:fast`                   | Pass                 | All five gates passed: ticket workflow, runner sabotage, formatting, unit tests, and the static stack.                             |
| First `npm run quality:delivery`         | Expected repair fail | Twelve product gates passed; ticket workflow rejected the fast row because its result cell included a gate count after `Pass`.     |
| Repaired `npm run quality:delivery`      | Pass                 | All 13 gates pass on one unchanged tree, including the corrected ticket ledger, and write the Test-phase receipt.                  |

### Inspection ledger

| Finding                                                                                                     | Resolution                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PROJECT.md` claimed the root exported reactive effects, but `src/index.ts` exports only `nextUpdate`. | Describe reactive state scheduling through `nextUpdate`; do not expand the package API to make stale prose true.                |
| `npm pack --dry-run` before building understated the artifact because the new internal declaration was old. | Treat the built installed-package report as authority and ratchet its 6,078,819-byte result to the next 4-KiB ceiling.          |
| The global action map had no exact inspection path.                                                         | Add a sorted private-module census and compare all 170 registered names; keep it absent from the package root.                  |
| Planned modular subpaths could be mistaken for current support.                                             | Classify `core`, `ui`, `datastar`, and `testing` subpaths as internal until their owning tickets publish installed conformance. |
| The first static run rejected an unused `method` binding in the request loop.                               | Remove the unused binding; focused ESLint and all 22 static gates pass without a warning allowance.                             |
| The first delivery ticket check treated `Pass, 5 gates` as a non-passing result.                            | Use the workflow's exact `Pass` result cell and keep counts in evidence prose; do not weaken the parser.                        |

## Document

### Documentation changed

- `README.md` publishes the 0.1 environment matrix, root side effect, stability promise, deprecation
  period, unsupported document topologies, and planned-subpath boundary.
- `docs/PROJECT.md` corrects the stale reactive-effect export claim and records compatibility,
  error-code, plugin-versioning, and internal-surface policy.
- `docs/BACKEND.md` records request bytes, credentials, event targets, ordering, and payload types.
- `docs/COMPONENT_ARCHITECTURE.md` binds component members, actions, and public events to the 0.x
  baseline while identifying the private model-write event.
- `quality/public-baseline.json` is the machine-readable compatibility index and points to the exact
  API, behavior, package, and release evidence.

### Acceptance evidence

| ID    | Outcome | Evidence                                                                                                                                                                       |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01 | Pass    | Five baseline tests compare 15 runtime exports, 152 type exports, jQuery installation, 11 static members, 51 UI members, 170 actions, the UMD name, and API Extractor.         |
| AC-02 | Pass    | The five-method table records URL, method, query, headers, JSON body, credentials, event aliases, target, and ordering; existing fixtures cover retry and cancellation.        |
| AC-03 | Pass    | Baseline event records name targets, cancelability, and detail types; fetch fixtures prove lifecycle order and unknown-SSE payloads, and component suites prove UI events.     |
| AC-04 | Pass    | The manifest inventories 16 directive forms, 19 event modifiers, and 12 expression-scope names; the 15-test declarative suite exercises their semantics and cleanup.           |
| AC-05 | Pass    | Delivery report `2026-08-31T17-37-08-654Z-65477` records 262 files, exact packed/unpacked bytes, three bundle sizes, and a reproducible SHA-256.                               |
| AC-06 | Pass    | Installed-package and browser gates prove jQuery 4, Node 24, ESM, CommonJS, UMD/CDN, browser modules, Chromium, Firefox, WebKit, and ordinary documents; docs name exclusions. |
| AC-07 | Pass    | The root/API comparison caught and corrected the false reactive-effect export claim; package/API checks found no remaining disagreement.                                       |
| AC-08 | Pass    | The schema requires stable, deprecated, and internal dispositions; policy gives one minor release of notice and explicitly withholds 0.1 error-code and plugin promises.       |

### Completion audit

Status: Complete

Every criterion has executable or installed-artifact evidence. Test-phase validation and the
worktree receipt passed against delivery report `2026-08-31T17-37-08-654Z-65477`. Ticket 0041's
hosted-workflow criterion remains a separate remote-state blocker; its local runner, schema,
receipt, and phase enforcement supplied this ticket's evidence. Ticket 0004 can now consume this
baseline without widening the 0.1 package surface.

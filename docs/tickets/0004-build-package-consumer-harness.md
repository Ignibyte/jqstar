---
id: 0004
title: Build the package consumer harness
status: done
created: 2026-08-30
updated: 2026-08-31
---

# 0004: Build the package consumer harness

## Plan

### Problem

The original package smoke tests imported files from `dist/` inside the repository and inspected
`npm pack --dry-run`. Ticket 0044 subsequently built an installed-tarball quality gate, but this
ticket still describes that harness as absent and its peer and lifecycle requirements need an exact
acceptance audit.

### Current evidence

- `scripts/quality-package.mjs` builds and packs the package, extracts the tarball outside the
  repository, installs it into a separate consumer, and runs ESM, CommonJS, NodeNext, Bundler,
  QUnit, Vite bundle, CLI, and private-path fixtures.
- Its real pages load the installed module and UMD builds in Chromium, Firefox, and WebKit, but
  currently check only installation functions rather than booting and disposing an application.
- The harness installs the declared jQuery 4 peer for positive consumers. It does not prove or
  document the missing-peer and incompatible-jQuery failure modes.
- Delivery report `2026-08-31T17-51-19-094Z-90817` passed package quality with 13 checks against the
  262-file tarball and three browser engines.
- `scripts/smoke-built.mjs` and `scripts/smoke-package-files.mjs` remain fast developer smoke tests;
  they are not used as installed-artifact evidence.

### Scope

- Pack the current package and install it into isolated temporary consumer fixtures.
- Add fixtures for Node ESM, supported CommonJS, TypeScript `NodeNext`, TypeScript `Bundler`,
  browser modules, and root UMD script tags.
- Establish baseline Chromium, Firefox, and WebKit smoke projects against the installed tarball.
- Verify peer dependency behavior, declarations, global augmentation, package contents, version
  consistency, source maps, and consumer-visible files.
- Add an extensible bundle inspection fixture that later proves a core-only entry excludes optional
  package sentinels.
- Record compressed and uncompressed entry sizes from the packed artifact.

### Out of scope

- Adding `core`, `ui`, or `datastar` entry points. Ticket 0013 uses this harness to publish them.
- Requiring every future optional plugin to ship CommonJS or UMD.

### Dependencies

- Tickets 0003 and 0041 through 0043.

### Acceptance criteria

- [x] [AC-01] Tests install the actual tarball outside the repository before importing it.
- [x] [AC-02] Supported ESM, CommonJS, TypeScript, browser-module, and UMD consumers pass.
- [x] [AC-03] Chromium, Firefox, and WebKit smoke projects load the installed root package, boot and
      dispose one application, and run in the normal project gate.
- [x] [AC-04] Missing peer dependencies and incompatible jQuery versions fail with documented
      behavior.
- [x] [AC-05] The harness verifies package contents, declarations, globals, source maps, and version
      fields.
- [x] [AC-06] Size reporting reads the packed artifact and records compressed and uncompressed
      bytes.
- [x] [AC-07] Consumer fixtures can add new subpath and tree-shaking assertions without copying the
      runner.
- [x] [AC-08] Temporary consumers cannot import repository source or undeclared private paths.

### Design

Use explicit temporary directories and local tarball installation. Keep fixture dependencies pinned
and commands noninteractive. Failures must print the consumer, import mode, and exact resolution or
type error.

Keep all consumer cases under the existing `installed-consumer`, `browser-consumers`, and
`bundle-sentinel` report checks so package-report compatibility does not change. Return structured
evidence from those checks instead of adding one-off top-level gates.

### Decisions

- jQuery `>=4.0.0 <5` is the only supported peer range for 0.1. A missing peer fails at module
  resolution; an incompatible installed peer fails a strict npm install.
- Positive fixtures install the exact tarball path. Negative peer fixtures use independent
  directories so neither npm's peer auto-install nor the positive consumer can mask the result.
- Browser module and UMD pages must create one declarative application through `$.star.boot`, read
  its instance, destroy it through the jQuery plugin, and prove `destroyed === true`.
- Future subpaths extend the same installed consumer and bundle sections. Tickets 0013 and 0014 own
  the future entry points and do not expand the current root here.

### Risks

- Package-manager caches can hide undeclared files. Run fixtures from the installed package path and
  assert that imports resolve inside the temporary consumer.
- Browser UMD proof needs a real page. Reuse Playwright instead of treating jsdom as script-tag
  proof.
- npm's normal peer auto-install can make a missing-peer test pass accidentally. Use
  `--legacy-peer-deps` only for that negative fixture, then require the installed import to fail for
  `jquery` resolution.

### Planned files

- `scripts/quality-package.mjs`: Add isolated peer failures and real browser boot/dispose proof.
- `schema/package-report.schema.json`: Require structured positive-consumer and peer-failure
  evidence from a passing installed-consumer check.
- `test/package-release-hardening.test.mjs`: Keep installed-consumer evidence fail-closed under
  schema and sabotage tests.
- `docs/TESTING.md`: Document positive consumers, peer failures, and browser lifecycle proof.
- `docs/QUALITY_PROGRAM.md`: Record package-harness ownership and evidence semantics.
- `docs/tickets/0004-build-package-consumer-harness.md`: Reconcile and close the ticket workflow.
- `docs/tickets/0044-prove-browser-package-quality.md`: Remove the fulfilled 0004 dependency from
  its remaining-work audit.

### Verification plan

- Run the new consumer harness against a freshly packed tarball.
- Run `npm run check`, `npm run test:package`, and `git diff --check`.

## Code

### Changed-file ledger

| File                                                  | Purpose                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `scripts/quality-package.mjs`                         | Missing/incompatible peer refusals and browser boot/dispose consumers. |
| `schema/package-report.schema.json`                   | Fail-closed installed-consumer and lifecycle evidence.                 |
| `test/package-release-hardening.test.mjs`             | Peer and lifecycle evidence sabotage.                                  |
| `README.md`                                           | Public jQuery peer range and failure behavior.                         |
| `config/quality-budgets.json`                         | Next-4-KiB packed ceiling after public peer documentation.             |
| `quality/public-baseline.json`                        | Current packed measurements, checksum, and evidence paths.             |
| `docs/TESTING.md`                                     | Installed peer and three-browser lifecycle fixtures.                   |
| `docs/QUALITY_PROGRAM.md`                             | Current package measurements and report semantics.                     |
| `docs/tickets/0004-build-package-consumer-harness.md` | Current Plan → Code → Test → Document evidence.                        |
| `docs/tickets/0044-prove-browser-package-quality.md`  | Fulfilled ticket-0004 dependency audit.                                |

### Design changes

Keep the existing 13-check package report. The installed-consumer check now returns a structured
positive-consumer list plus exact missing and incompatible peer failures. The browser-consumer check
adds `lifecycle: boot-and-dispose` only after both installed module and UMD pages render one signal
and prove the application instance is destroyed in all three engines.

Negative peer consumers live beside, not inside, the positive consumer. The missing-peer install
uses `--legacy-peer-deps` to suppress npm's automatic peer installation, then the package import
must fail for `jquery`. The incompatible fixture uses `--strict-peer-deps` with jQuery 3.7 and must
fail with both `ERESOLVE` and `jquery` diagnostics.

The new public peer documentation moved the packed tarball 42 bytes beyond its old ceiling. The
existing next-4-KiB rule moves only the packed ceiling to 1,859,584 bytes. The current artifact is
262 files, 1,855,530 packed bytes, and 6,081,008 unpacked bytes.

## Test

| Command                                    | Result               | Evidence                                                                                                                            |
| ------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| First package-report schema test           | Expected repair fail | AJV strict mode rejected two marker refinements without an explicit object type.                                                    |
| Repaired package/release hardening suite   | Pass, 9 tests        | Peer evidence, lifecycle evidence, report ordering, API drift, budgets, manifests, and false-green sabotage passed.                 |
| `node scripts/quality/validate-json.mjs`   | Pass                 | Forty-two JSON files parsed; four instances and fifteen schemas validated.                                                          |
| Initial `npm run test:package:quality`     | Pass, 13 checks      | Peer refusals and module/UMD boot-dispose proof passed before the public failure text changed the artifact.                         |
| Package quality after README peer guidance | Expected repair fail | The real tarball measured 1,855,530 packed bytes, 42 bytes beyond the previous packed ceiling.                                      |
| Repaired `npm run test:package:quality`    | Pass, 13 checks      | The 262-file installed tarball passed positive consumers, both peer refusals, three-browser lifecycle, API, bundle, and CLI checks. |
| `npm run test:release:quality`             | Pass, 7 checks       | Two clean installs reproduced SHA-256 `33c53820992993eb4d67679afac8dfac4b1ddbfbd071d8bb842eb28579724e08`.                           |
| Fast-gate constituent run                  | Pass                 | Runner sabotage, formatting, all 403 unit tests, and all 22 fast static gates passed.                                               |
| `npm run quality:fast`                     | Pass                 | The canonical five-gate fast wrapper passes on the frozen Code-phase tree.                                                          |
| `npm run quality:delivery`                 | Pass                 | All 13 gates pass on one unchanged tree and write the Test-phase receipt.                                                           |

### Inspection ledger

| Finding                                                                                     | Resolution                                                                                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Browser pages checked installed functions but never created an application.                 | Both installed formats boot, render signal `1`, dispose, and expose `destroyed === true` in all three engines.            |
| Positive fixtures always installed jQuery 4, masking peer failure behavior.                 | Isolate a missing-peer import refusal and a strict jQuery-3.7 installation refusal, then require their diagnostics.       |
| Passing installed-consumer detail could remain an arbitrary string.                         | The package schema now requires exact consumer names, peer range, nonzero exits, diagnostic markers, and lifecycle label. |
| Public peer documentation pushed the compressed artifact beyond its previous 4-KiB ceiling. | Record the real built measurement and move only that ceiling to the next 4-KiB boundary.                                  |

## Document

### Documentation changed

- `README.md` documents the required jQuery peer range and the strict-install and missing-module
  failure behavior.
- `docs/TESTING.md` documents the positive installed consumers, isolated peer failures, and
  module/UMD boot-render-dispose lifecycle in all three engines.
- `docs/QUALITY_PROGRAM.md` records the current artifact measurements, packed ceiling, structured
  installed-consumer evidence, and browser lifecycle label.
- `quality/public-baseline.json` records the current artifact, checksum, and delivery evidence.
- `schema/package-report.schema.json` publishes the fail-closed installed-consumer evidence shape.

### Acceptance evidence

| ID    | Outcome | Evidence                                                                                                                                                               |
| ----- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Pass    | `quality-package.mjs` writes the tarball to a temporary pack directory, extracts it outside the repository, and installs that exact path into isolated consumers.      |
| AC-02 | Pass    | Delivery package evidence passes ESM, CommonJS, NodeNext, Bundler, browser module, UMD, and QUnit consumers from the installed tarball.                                |
| AC-03 | Pass    | Chromium 151, Firefox 153, and WebKit 26.5 each boot, render signal `1`, and dispose module and UMD applications; report lifecycle is `boot-and-dispose`.              |
| AC-04 | Pass    | The missing-peer import exits 1 with `jquery`; strict jQuery-3.7 installation exits 1 with `ERESOLVE` and `jquery`. README and testing docs state both failures.       |
| AC-05 | Pass    | Export/file checks require both declarations, both source maps, UMD/ESM/CSS, API augmentation, package/source version equality, registry, CLI, and four public guides. |
| AC-06 | Pass    | The built tarball reports 262 files, 1,855,530 compressed bytes, and 6,081,008 unpacked bytes; bundle files and consumer output have separate ceilings.                |
| AC-07 | Pass    | Installed consumer, browser consumer, and bundle-sentinel sections share one runner; future-contract records reserve `core` and `testing` assertions for 0013/0014.    |
| AC-08 | Pass    | The ESM consumer requires `ERR_PACKAGE_PATH_NOT_EXPORTED` for a private path, and every fixture resolves from its temporary installed package rather than source.      |

### Completion audit

Status: Complete

Every criterion has installed-artifact evidence. Test-phase validation and the worktree receipt
passed against delivery report `2026-08-31T18-13-11-338Z-43975`. The local quality, coverage,
mutation, browser, and package implementations from 0041 through 0044 supplied the dependency
evidence; their hosted workflow and future-entry criteria remain separately tracked. Tickets 0013
and 0014 can extend this runner without reopening the root 0.1 package contract.

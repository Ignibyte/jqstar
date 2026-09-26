---
id: 0055
title: Reconcile package budgets with the expanded public UI
status: done
created: 2026-09-23
updated: 2026-09-23
---

# 0055: Reconcile package budgets with the expanded public UI

## Plan

### Problem

Ticket 0054's browser-first policy passes every new browser and quality contract, but the inherited
package-size failures prevent `npm run check` from issuing a receipt. The published root install and
all UI components must remain available. The archive can shrink by removing duplicate source-map
content; the runtime limits need a measured one-time reset because the public UI graph has expanded
since the immutable baseline.

### Current evidence

Delivery report `2026-09-24T03-29-18-780Z-17137/report.json` has matching start/end fingerprints and
passes 76 fast component cases and all 1,717 browser cases. Package quality alone measures 3,417,877
packed bytes against 3,174,000 combined allowances, a 558,894-byte Mobile reference UMD against
462,311 reviewed, and a 634,769-byte installed root consumer against 542,720. The package budget
sabotage control fails isolation because the same three checks are already red. Prior UMD minifier
probes saved at most about 8 KB, far short of the runtime gap. A like-for-like archive simulation
under `.git/jqstar/package-map-simulation-a856d951/` externalized 30 repeated embedded source texts
from built maps, reducing packed bytes by 335,824 while retaining each source at a resolvable
packaged path. The actual tarball now measures 3,091,755 packed bytes, 9,898,789 unpacked bytes and
297 files, under all unchanged archive limits. Its extracted maps verify 30 exact source files and
88 references. Shipped bundles still exceed four ceilings: UMD 558,894 versus 464,896, UI CommonJS
408,086 versus 318,464, UI ESM 409,736 versus 318,464, and CSS 170,036 versus 169,984. The installed
root consumer measures 634,769 versus 542,720. A diagnostic installed-consumer pass also found core
gzip 64,233 versus 63,000, CSP gzip 45,924 versus 45,000, CSP Brotli 40,349 versus 39,000, and
stores gzip 67,576 versus 66,560. These are built artifacts, not minifier estimates.

### Scope

- Deduplicate selected source-map `sourcesContent` into packaged source files while retaining
  resolvable mappings and exact source bytes. Verify package integrity and browser debugging.
- Keep archive limits unchanged. Reset only the nine measured bundle/consumer ceilings to their next
  1-KiB boundaries with an exact, one-time ratchet exception tied to their old limits. Update the
  Mobile reference's exact UMD measurement to match the tested package artifact.
- Preserve the public root install, every exported entry, native component behavior, installed
  consumers, eight-project browser matrix, release, static, detector and ticket checks.

### Out of scope

This ticket does not remove documented public UI components, rewrite the browser-first testing
policy, reintroduce unit or mutation gates, or raise archive, other bundle, browser-operation or
generated-output limits. It does not make the ratchet generally configurable.

### Acceptance criteria

- [x] [AC-01] Packed and unpacked tarballs and file count pass unchanged budgets; every shipped
      bundle passes its reviewed limit with source maps resolving to byte-identical packaged
      sources.
- [x] [AC-02] The Mobile reference UMD and installed root consumer match their reviewed measurements
      while preserving installed module, UMD, QUnit, TypeScript and browser behavior.
- [x] [AC-03] The immutable ratchet allows only the nine exact reviewed ceiling transitions, rejects
      other increases and removals, and remains covered by positive and negative controls.
- [x] [AC-04] Budget-sabotage isolation, release reproducibility and all browser projects pass on
      the exact package candidate.
- [x] [AC-05] `npm run check` passes on the final documented worktree and issues a current receipt,
      allowing ticket 0054 to complete without changing its testing policy.

### Design

First implement deterministic post-build map externalization for the measured repeated sources, with
a verifier that proves each map reference resolves to its original content in the installed tarball.
Record exact before/after archive and map metrics. The UMD and root module graphs show that the
roughly 90-KiB gaps are spread across the expanded public UI; minifier probes save less than 8 KiB.
Keep the existing root install and set nine individual ceilings at the next 1-KiB boundary above
their measured artifacts: UMD 559,104; UI CommonJS 408,576; UI ESM 410,624; CSS 171,008; installed
root consumer 634,880; core gzip 64,512; CSP gzip 46,080; CSP Brotli 40,960; stores gzip 67,584. The
ratchet exception identifies these nine old/new pairs in code; it applies only when the immutable
base has the recorded old value and rejects anything above the new value. Once that baseline is
committed, normal immutable comparison keeps it fixed. Preserve all other ratchets and sabotage
controls. The Mobile reference records exact UMD bytes, not a ceiling, so it must update to 558,894
for the same tested artifact.

### Decisions

- Retain archive and all unrelated limits. The nine larger runtime limits reflect actual public UI
  growth and are narrow, reviewed exceptions to the immutable ratchet, not a generic bypass.
- Keep this package correction separate from ticket 0054 so browser-first policy evidence remains
  reviewable on its own.

### Risks

External source files can break debugging if relative paths are wrong or maps lose their original
bytes. A reset can hide future size growth if its exception is broad; bind each exception to an old
and maximum new value, and prove unrelated increases remain red. The full installed and cross-engine
browser checks must confirm the preserved public behavior.

### Verification plan

Validate this Plan before edits. Add direct map integrity and missing/tampered-source negatives,
then compare actual `npm pack` bytes. Add positive and negative ratchet tests for exact reviewed
transitions, unrelated increases, removals and any value over an approved maximum. Run package
quality, release and browser checks after changing limits. Finish with exact-tree
`npm run quality:fast` and `npm run check`, ticket phase validation and the measured tradeoff.

### Planned files

- `scripts/quality/externalize-source-maps.mjs`, `package.json`, `scripts/quality-package.mjs`,
  focused tests and schema if needed: Deterministic map transformation and installed verification.
- `config/quality-budgets.json`, `scripts/quality/budget-ratchet.mjs`, its focused test,
  `scripts/quality-0044-self-test.mjs` and `quality/jquery-mobile-migration.json`: Exact runtime
  reset, ratchet proof and detector's exact focused-test count.
- `docs/DEVELOPMENT.md`, `docs/PROGRAM_AUDIT.md`, `docs/tickets/ROADMAP.md`, this ticket and ticket
  0054: Build contract and delivery evidence.

## Code

### Changed-file ledger

| File                                                                                                                                                                                         | Purpose                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/quality/source-map-packaging.mjs`; `scripts/externalize-source-maps.mjs`; `package.json`                                                                                            | Externalize 30 repeated source-map inputs after both Vite builds.                                                                                                        |
| `scripts/quality-package.mjs`; `test/source-map-packaging.test.mjs`; `quality/gates.mjs`; `vitest.config.ts`; `vitest.coverage.config.ts`                                                    | Verify extracted map sources and keep Node detector tests in the runner self-test.                                                                                       |
| `config/quality-budgets.json`; `scripts/quality/budget-ratchet.mjs`; `quality/jquery-mobile-migration.json`; `test/package-release-hardening.test.mjs`; `scripts/quality-0044-self-test.mjs` | Reset nine measured size ceilings, bind each ratchet exception to its old value and maximum, review the exact Mobile UMD bytes, and update the exact focused-test count. |
| `docs/DEVELOPMENT.md`; `docs/PROGRAM_AUDIT.md`; `docs/tickets/ROADMAP.md`; ticket 0054; this ticket                                                                                          | Explain package mapping and record budget evidence.                                                                                                                      |
| `docs/QUALITY_PROGRAM.md`                                                                                                                                                                    | Explain the narrow immutable-ratchet exception.                                                                                                                          |

### Design changes

The measured top 30 repeated TypeScript inputs are copied under `dist/sources/`. Their source-map
entries point to those files, retain mapping indexes, and replace duplicate embedded content with
`null`. The build writes a manifest of exact SHA-256 digests and reference counts. Package quality
checks the extracted tarball against that manifest before installed consumers. The archive budget
passes unchanged. Nine built bundle/consumer measurements receive next-1-KiB ceilings. The ratchet
recognizes only those exact old-to-new transitions; ordinary increases, removals and values above a
reviewed maximum still fail. The Mobile reference's exact UMD measurement is 558,894 bytes.

## Test

| Command                                                                            | Result                                                       | Evidence                                                                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test test/source-map-packaging.test.mjs`                                   | Pass, four cases.                                            | Source bytes, map paths, missing/tampered source and stale embedded content controls.                                                                       |
| `npm run build:self-hosted`                                                        | Pass.                                                        | Both Vite builds and site bundle complete with 30 externalized sources.                                                                                     |
| `npm pack --ignore-scripts --json`                                                 | Pass, 3,091,755 packed bytes, 9,898,789 unpacked, 297 files. | Actual tarball; all three archive limits pass unchanged.                                                                                                    |
| Extract actual tarball and run `verifyExternalizedSourceMaps`                      | Pass, 30 source files and 88 references.                     | `.git/jqstar/standalone/source-map-packaging/`.                                                                                                             |
| `npm run test:package:quality` (before reset)                                      | Fail on raw UMD, Mobile reference and root consumer limits.  | Initial measured run; packed size passed.                                                                                                                   |
| `npm run test:package:quality` (five-limit candidate)                              | Fail on core gzip 64,233 versus 63,000.                      | Installed modules, types, QUnit and browsers passed first.                                                                                                  |
| Temporary measurement-only installed-consumer pass                                 | Found four compressed-consumer overruns.                     | Core gzip 64,233; CSP gzip 45,924; CSP Brotli 40,349; stores gzip 67,576. Temporary script and false-green report removed.                                  |
| `npx vitest run test/package-release-hardening.test.mjs --config vitest.config.ts` | Pass, 16 cases.                                              | Ratchet permits nine exact transitions and rejects above-cap, wrong-base, unrelated and removed ceilings.                                                   |
| `npm run test:package:quality` (nine-limit candidate)                              | Pass, 13 checks.                                             | `.git/jqstar/standalone/ticket-0044/package-report.json`; actual tarball, maps, installed consumers and browser engines.                                    |
| `npm run test:release:quality`                                                     | Pass, seven checks.                                          | Reproducible package tarball and installed release contracts.                                                                                               |
| `npm run quality:fast`                                                             | Pass                                                         | Six gates and 76 browser component cases; `2026-09-24T04-19-23-460Z-95241/report.json`.                                                                     |
| `npm run check` (first reset candidate)                                            | Fail, 11 of 12 gates passed.                                 | `2026-09-24T04-44-59-359Z-46107/report.json`: package 13/13, release 7/7, browser 1,717/1,717; detector expected 15 focused tests while 16 passed.          |
| `npm run test:quality:0044` (corrected count)                                      | Pass, 16 detector controls.                                  | `.git/jqstar/standalone/ticket-0044/self-test-report.json`; package-budget sabotage is isolated.                                                            |
| `npm run check` (`quality:delivery`, corrected detector)                           | Pass                                                         | `2026-09-24T05-25-23-228Z-18075/report.json`: all 12 gates, 1,717 browser cases, package 13 checks, release seven, detector 16; exact-tree receipt written. |

### Inspection ledger

| Finding                                                                                      | Resolution                                                                                                |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Duplicate embedded source text kept the packed archive over budget.                          | Externalized repeated map text into digest-checked packaged files; packed bytes now pass.                 |
| Expanded UI graph exceeds historical UMD, UI bundle and root limits.                         | Narrow one-time reset of measured artifacts preserves existing public installation.                       |
| The first package pass exposed compressed-consumer limits only after earlier checks cleared. | Measured all later consumers with a temporary diagnostic, removed it, then passed the real 13-check gate. |
| The detector self-test expected the earlier 15-case focused suite.                           | Updated its exact count to 16 after the new ratchet case; rerun the detector and delivery.                |

## Document

### Documentation changed

`docs/DEVELOPMENT.md` explains the packaged source-map paths and integrity manifest.
`docs/QUALITY_PROGRAM.md` records the nine exact one-time ratchet exceptions.
`docs/PROGRAM_AUDIT.md` records actual tarball, installed-consumer, browser and release evidence.
`docs/tickets/ROADMAP.md` tracks the package correction separately from ticket 0054, whose public
and brain testing guidance remains browser-first.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                   | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | Actual 3,091,755-byte tarball fits unchanged archive limits; 30 exact files and 88 map references verify from extraction; all shipped bundle checks pass in package report.                | Pass   |
| AC-02 | Package report passes Mobile's exact 558,894-byte UMD, 634,769-byte root consumer against 634,880, installed ESM/CommonJS/TypeScript/QUnit and three browser engines.                      | Pass   |
| AC-03 | Focused 16-case hardening suite accepts only nine old/new transitions; over-maximum, wrong-base, unrelated increase and removed-ceiling controls fail.                                     | Pass   |
| AC-04 | Delivery's 16 detector controls pass, including isolated package-budget sabotage; release passes seven checks and browser quality passes 1,717 cases across eight projects.                | Pass   |
| AC-05 | `2026-09-24T05-25-23-228Z-18075/report.json` passes all 12 gates on matching 943-file fingerprints and writes a receipt; final documentation is followed by a new exact-tree delivery run. | Pass   |

### Completion audit

The source-map package preserves original source bytes and resolvable mappings. The nine reviewed
runtime ceilings retain only the measured headroom and reject any further increase over the approved
maxima. Installed packages, release reproducibility, cross-engine browsers, detector controls and
the browser-first testing policy all pass on an unchanged implementation tree. The final documented
tree receives its own delivery check before this ticket is treated as closed.

Status: Complete

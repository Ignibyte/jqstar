---
id: 0051
title: Align current release guidance and candidate evidence
status: done
created: 2026-09-05
updated: 2026-09-06
---

# 0051: Align current release guidance and candidate evidence

## Plan

### Problem

The package and release contract describe 1.1.0, but release instructions still name the 1.0.0
branch, version, tag and output directory. Candidate proof also expects the old quality gate list
and omits the completed stores/persistence tickets and their public policies. A green delivery run
would therefore fail candidate proof, and the candidate inventory could omit shipped 1.1 work.

### Current evidence

- Checkpoint `13ab50e` contains completed ticket 0020 and declined 0021/0022. The prior delivery
  receipt matched before the local checkpoint commit.
- `quality/release-contract.json` sets version 1.1.0, branch `feat/shared-stores`, tag `v1.1.0` and
  output `.git/jqstar/releases/1.1.0`.
- `quality/gates.mjs` requires private research dependency preparation, absent from the release
  contract's exact full-audit/delivery lists. Existing candidate tests build reports from the same
  contract and therefore did not detect drift from the real runner.
- Candidate prerequisites/policy files and their schemas still use the 1.0 inventory counts.
- Public support/security and project-brain text contain stale candidate or 0.x descriptions.
  Historical migration and ticket evidence must keep their original version identities.

### Reopening decision (2026-09-06)

Ticket 0033's website copy audit found the homepage badge still says
`jQStar 1.0.0 release candidate`, while `package.json`, the release contract, README, and download
guide identify 1.1.0. The generated full-text corpus and both JSON indexes repeat the stale homepage
statement inside otherwise current 1.1.0 metadata. Existing generation tests prove byte consistency,
but did not compare that authored candidate statement with the release authority.

Return to Plan for this bounded copy correction. Reopen AC-01 and AC-04. Update the homepage badge
to the existing candidate version, verify that source statement against package/release identity,
require the generated home record to contain the same current candidate statement, and assert the
visible badge in the existing home browser test. Regenerate public agent content through its normal
generator. Historical migration and plugin API version references retain their actual meanings.

Additional planned paths are `example/index.html`, `test/site-structure.test.mjs`,
`test/agent-content.test.mjs`, `e2e/site.spec.ts`, `example/public/llms-full.txt`,
`example/public/jqstar-agent-index.json`, `example/agent-content.generated.json`, `docs/TESTING.md`,
and ticket 0033. Record the correction in this ticket and the roadmap. No candidate version, package
API, dependency, or publication policy changes.

Validate Plan before Code. Demonstrate the stale statement with the focused source/corpus tests,
then pass those tests, the release-candidate suite, current three-engine website/native WebMCP
checks, fast and full delivery gates, and phase validation. Ticket 0039's running delivery was
interrupted before final candidate proof so both website corrections can be verified together. The
stopped report cannot authorize delivery.

### Scope

- Align release command examples, source preconditions and artifact paths to the existing 1.1
  contract. Preserve the candidate/publication distinction and existing publication workflow.
- Describe support independently of whether a particular historical version was published.
- Correct current brain/compatibility descriptions for stores and persistence and stable 1.x.
- Include completed tickets 0018/0019 and their public policies in candidate evidence. Match exact
  quality-gate sequences to the canonical runner without weakening required gates.
- Add cross-source candidate contract assertions so future runner/service changes cannot silently
  leave release proof behind. Update closed schema counts to the actual reviewed inventory.

### Out of scope

- Publishing, tagging, pushing, changing infrastructure, or preparing a public release.
- New runtime behavior, API, dependency, support duration, or candidate version.
- Rewriting historical 1.0 migration guidance or completed-ticket provenance.
- Navigation and inspection implementation; tickets 0023 and 0030 follow this cleanup.

### Acceptance criteria

- [x] [AC-01] Current release instructions agree with the contract's package/version, source branch,
      tag, output directory and handoff commands, and preserve publication controls. The public
      homepage and generated home record identify the same current candidate version.
- [x] [AC-02] Current support/security/brain/compatibility guidance accurately describes 1.x and
      optional stores/persistence while historical version evidence remains intact.
- [x] [AC-03] Candidate gates exactly match the canonical runner, and completed stores/persistence
      tickets and policies are required by the closed manifest/schema and prerequisite audit.
- [x] [AC-04] Cross-source regression checks, focused release tests, schema/static checks,
      `npm run check`, ticket phase validation and `git diff --check` pass; no runtime API or
      external publication action is introduced.

### Design

Keep the release contract as the executable authority. Update its exact inventories and closed
schema counts, then compare the canonical runner's actual ordered gate IDs in release contract
tests. Verify that every shipped optional service has its owning ticket and policy in candidate
evidence. Documentation remains ordinary prose with current explicit command examples.

### Decisions

- Keep 1.1.0 and the current branch policy; this is evidence cleanup, not a new candidate version.
- Keep exact counts and sequence enforcement. Add an independent runner comparison rather than
  making candidate verification accept arbitrary extra or missing gates.
- Record cleanup separately from completed ticket 0020 and the upcoming feature decisions.

### Risks

Blind version replacement would corrupt historical migration or plugin API version claims. Restrict
edits to current-candidate guidance and inspect remaining 1.0 references by context. Candidate
schemas and fixtures must move together without relaxing evidence identity or completeness.

### Verification plan

- Run the existing release-candidate contract suite with new independent runner/service assertions.
- Validate all JSON schemas and current prerequisite ticket evidence.
- Regenerate affected public agent content if source guidance changes its corpus.
- Run fast and complete delivery gates, record phase closures, and verify the final tree receipt.

### Planned files

- `RELEASING.md`, `SUPPORT.md`, `SECURITY.md`: current candidate instructions and
  publication-neutral support wording.
- `docs/{README,PROJECT,COMPATIBILITY}.md`: stable 1.x and optional persistence accuracy.
- `quality/release-contract.json`, `schema/release-{contract,candidate}.schema.json`: exact current
  gate, prerequisite and policy inventory.
- `test/release-candidate-contract.test.mjs`: compare independent canonical runner and service
  inputs.
- `docs/tickets/ROADMAP.md`, this ticket: cleanup placement, phases and direct evidence.
- Generated agent corpus files, if affected by the reviewed source changes.

## Code

### Corrective Code ledger (2026-09-06)

Plan validation passed before the following correction.

| File                                                                                                             | Purpose                                                                                |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `example/index.html`                                                                                             | Show the current 1.1.0 candidate in the homepage badge.                                |
| `test/site-structure.test.mjs`                                                                                   | Compare authored home/download candidate wording with package and release identity.    |
| `test/agent-content.test.mjs`                                                                                    | Reject a generated home statement that conflicts with current corpus package metadata. |
| `e2e/site.spec.ts`                                                                                               | Observe the current candidate badge in the existing three-engine home proof.           |
| `example/public/llms-full.txt`, `example/public/jqstar-agent-index.json`, `example/agent-content.generated.json` | Regenerate the homepage statement from its corrected public source.                    |
| `docs/TESTING.md`                                                                                                | Document cross-source candidate wording checks.                                        |
| This ticket, ticket 0033, and `docs/tickets/ROADMAP.md`                                                          | Preserve the finding, reopening scope, execution and closure evidence.                 |

### Changed-file ledger

| File                                              | Purpose                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `RELEASING.md`                                    | Align version, branch, tag, output and handoff command examples to 1.1.0.             |
| `SUPPORT.md`, `SECURITY.md`                       | Describe published-line support without stale candidate-version claims.               |
| `docs/{README,PROJECT,COMPATIBILITY}.md`          | Current stable 1.x, stores/persistence and server-authority descriptions.             |
| `quality/release-contract.json`                   | Match canonical gate order and include stores/persistence tickets and policies.       |
| `schema/release-{contract,candidate}.schema.json` | Require 36 prerequisite tickets, 17 policies and exact 15/13 gate counts.             |
| `test/release-candidate-contract.test.mjs`        | Independently compare actual runner gates and shipped service prerequisites/policies. |
| `docs/tickets/ROADMAP.md`, this ticket            | Record cleanup scope, placement and execution evidence.                               |

### Design changes

No changes from the reviewed scope.

## Test

| Command                                                      | Result | Evidence                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (`quality:delivery`) | Pass   | Run `2026-09-06T18-36-18-416Z-79694` executes all 13 gates: 1,349 unit tests, 487 browser passes with zero failed/flaky/skipped cases, 13 package and seven release checks, and all 16 detector controls. The exact current receipt and both corrective Test phase validations passed before these documentation edits. |

| Command                                               | Result | Evidence                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` (combined website corrections) | Pass   | Run `2026-09-06T18-33-38-682Z-72779` passes all five selected gates and 1,349 unit tests. The unchanged runner self-test is explicitly skipped. Exact Code phase validation passes for both 0039 and 0051 before the combined Test run.                                                                                             |
| Combined root and nested static builds and probes     | Pass   | `site-root-combined/probe.json` and `site-base-combined/probe.json` each record all 24 direct routes with and without JavaScript in three engines, all 22 shared-control routes, the current candidate badge, search navigation, dialog focus and toast behavior. No script errors, failed responses or external requests occurred. |

| Command                                                                                          | Result | Evidence                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan validation for this reopening                                                               | Pass   | `site-base-plan/0051-plan-validation.log` records the accepted correction scope before Code.                                                                                                                                                                       |
| `vitest run test/site-structure.test.mjs test/agent-content.test.mjs` before the fix             | Fail   | Both new cross-source checks detected the 1.0.0 statement under 1.1.0 authority; nine other cases passed. The source and generated-corpus failures remain in `site-base-plan/0051-before-fix.log`.                                                                 |
| `npm run build:agent-content`                                                                    | Pass   | Regenerated the full-text corpus and both JSON indexes from the corrected home source. The generated agent guide and short index did not change.                                                                                                                   |
| Focused source, agent-content, release-candidate, WebMCP, jQuery UI contract and property suites | Pass   | All 36 tests pass in `site-base-plan/0051-focused-unit.log`, including release identity and corpus consistency.                                                                                                                                                    |
| Combined three-engine website and native WebMCP browser suites                                   | Pass   | All 31 tests pass in `site-base-plan/0051-focused-browser.log`; the actual homepage badge, all documentation controls, harness registration and zero-mock native execution pass.                                                                                   |
| Focused ESLint and combined fast run `2026-09-06T18-31-45-796Z-68431`                            | Error  | ESLint rejected unqualified `DOMParser` and `window` globals in the new source test. The running fast command was deliberately interrupted before further checks; its report is not a pass. The test now uses the explicit jsdom constructor through `globalThis`. |

| Command                                                                                                                                                                     | Result  | Evidence                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-checkpoint `npm run quality:receipt` and `git diff --check`                                                                                                             | Pass    | Ticket 0020's final verified tree matched before checkpoint `13ab50e`.                                                                                                                                                                                           |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0051-align-current-release-guidance.md`                                                                      | Pass    | Cleanup scope and independent candidate checks frozen before implementation.                                                                                                                                                                                     |
| `npx vitest run test/release-candidate-contract.test.mjs`                                                                                                                   | Pass    | All six release tests, including independent canonical gate/service inventory and prerequisite audit.                                                                                                                                                            |
| `npm run build:agent-content`                                                                                                                                               | Pass    | Reviewed corpus remains unchanged after policy/brain cleanup.                                                                                                                                                                                                    |
| `node scripts/quality/validate-json.mjs`                                                                                                                                    | Pass    | 78 JSON files and 15 instances against 22 schemas.                                                                                                                                                                                                               |
| `npm run quality:fast`                                                                                                                                                      | Pass    | All six gates; report `2026-09-05T21-37-16-353Z-30208`.                                                                                                                                                                                                          |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0051-align-current-release-guidance.md --report .git/jqstar/runs/2026-09-05T21-37-16-353Z-30208/report.json` | Pass    | Exact implementation tree accepted before entering Test.                                                                                                                                                                                                         |
| `npm run check` (first delivery)                                                                                                                                            | Fail    | Report `2026-09-05T21-39-45-166Z-42041`: a blank line split the evidence table, hiding the fast result from ticket validation. Stopped the remaining run; corrected the table without product changes.                                                           |
| `npm run check` → `npm run quality:delivery` (corrected delivery)                                                                                                           | Pass    | Report `2026-09-05T21-41-16-562Z-61017`: all 13 gates passed, including 448 browser tests with zero skipped/flaky cases, 13 package checks and seven release checks.                                                                                             |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0051-align-current-release-guidance.md --report .git/jqstar/runs/2026-09-05T21-41-16-562Z-61017/report.json` | Pass    | Current implementation and full delivery evidence accepted before Document.                                                                                                                                                                                      |
| `npm run quality:receipt` and `git diff --check`                                                                                                                            | Pass    | Exact delivery receipt matched before Document; no whitespace errors.                                                                                                                                                                                            |
| Document validation and final delivery startup                                                                                                                              | Fail    | Validator requires the literal `quality:delivery` command in the ledger; `npm run check` alone did not satisfy its matcher. Stopped run `2026-09-05T21-56-55-091Z-14202` immediately, recorded the actual command delegation, and revalidated before restarting. |
| `npm run check` (final-tree audit)                                                                                                                                          | Stopped | Run `2026-09-05T21-57-23-962Z-24110` was stopped after the final documentation audit found `persist` missing from the project's public export list. Added the entry and selected-preference feature description before restarting.                               |

### Corrective inspection ledger (2026-09-06)

| Finding                                                                                               | Resolution                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The homepage badge and three corpus copies named a different candidate than package/release metadata. | Corrected the authored badge, regenerated the corpus, and compared both authored and generated statements with the existing release identity. Both checks failed before the fix and pass afterward. |
| Byte-identical corpus generation did not establish semantic agreement with package version metadata.  | Added the independent generated-home candidate assertion to the existing provenance test.                                                                                                           |
| The source test used browser globals outside its lint scope.                                          | Use the explicit jsdom constructor through `globalThis`; focused ESLint and the full fast gate pass.                                                                                                |
| Current visual evidence could be confused with a fresh reference comparison.                          | Inspect the new rendered badge and layout, retain image/probe identities, and explicitly leave original-reference comparison unclaimed.                                                             |

### Inspection ledger

| Finding                                                                   | Resolution                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Candidate tests derived expected gate lists from the same stale manifest. | Add comparison with the independent canonical runner.           |
| 1.1 services were absent from candidate prerequisite/policy inventory.    | Require their completed tickets and public policies explicitly. |

## Document

### Documentation changed

- `RELEASING.md` now uses the contract's 1.1.0 version, branch, tag and output paths throughout
  candidate preparation, handoff, publication examples and rollback. Existing approval controls and
  candidate/publication distinctions remain in force.
- `SUPPORT.md` and `SECURITY.md` describe published 1.x support without making stale pre-1.0
  availability claims. Support periods and reporting instructions are unchanged.
- The project brain and compatibility policy now describe stable 1.x and optional stores and
  selected browser-preference persistence. The roadmap records this cleanup before 0023/0030.
- Candidate inventories now require the shipped 1.1 service tickets and public policies. Exact
  ordered quality gates agree with the runner, and closed schemas require the reviewed counts.
- The original 2026-09-05 policy cleanup left the generated corpus unchanged. The 2026-09-06
  correction updates the homepage badge and regenerates the full-text corpus and both JSON indexes.
  Source, generated-content and visible browser assertions now require the current 1.1.0 statement.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                                                                                           |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass   | Release command, branch, tag and output examples agree with the 1.1.0 contract. The authored homepage, generated home record and visible badge agree with package/release identity. Both new consistency checks failed before correction and pass afterward; publication controls remain intact.                                                                   |
| AC-02     | Pass   | `SUPPORT.md`, `SECURITY.md`, `docs/{README,PROJECT,COMPATIBILITY}.md` describe current 1.x and optional stores/persistence. Historical migration/plugin-version evidence is unchanged; docs/static and corpus checks pass.                                                                                                                                         |
| AC-03     | Pass   | The contract and schemas require 36 prerequisite tickets and 17 policy files. Independent runner comparison and explicit 0018/0019 service-policy assertions pass in `test/release-candidate-contract.test.mjs`; the full release/package gates pass.                                                                                                              |
| AC-04     | Pass   | The 36 focused tests, 31 website/native WebMCP cases, root/nested three-engine probes, 1,349-unit fast run and all 13 delivery gates pass. Exact Code and Test phase validations passed before documentation edits. The correction changes current copy, generated content, regression checks and evidence records; no runtime API or external publication change. |

### Completion audit

All four criteria have direct current evidence. The candidate remains 1.1.0. The homepage and
generated copies now agree with the existing release authority, and the new assertions detect the
original contradiction. Complete delivery `2026-09-06T18-36-18-416Z-79694` and exact Test phase
validation passed before this closure record. The final documentation state requires a fresh
delivery receipt before commit. The separate private-reporting setting finding belongs to 0017;
actual manual accessibility and full program acceptance remain owned by their open tickets.

Status: Complete

### Historical completion audit (2026-09-05)

All four criteria have direct current-source and executable evidence. The candidate contract matches
both the canonical runner and the shipped 1.1 services. Historical version records, runtime APIs,
dependencies and support durations are unchanged. No publishing, tagging, pushing or other external
write occurred. The first delivery failure remains documented with its table correction and green
rerun. Navigation decision and inspection work remain in their separate tickets.

Historical status: Complete

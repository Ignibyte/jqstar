---
id: 0051
title: Align current release guidance and candidate evidence
status: done
created: 2026-09-05
updated: 2026-09-05
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
      tag, output directory and handoff commands, and preserve publication controls.
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
- Agent-content regeneration passed with no generated corpus changes.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                      |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `RELEASING.md` command/path/branch audit agrees with `quality/release-contract.json` and the current 1.1.0 package. The full release gate passes; publication controls remain intact.                                                                                         |
| AC-02     | Pass   | `SUPPORT.md`, `SECURITY.md`, `docs/{README,PROJECT,COMPATIBILITY}.md` describe current 1.x and optional stores/persistence. Historical migration/plugin-version evidence is unchanged; docs/static and corpus checks pass.                                                    |
| AC-03     | Pass   | The contract and schemas require 36 prerequisite tickets and 17 policy files. Independent runner comparison and explicit 0018/0019 service-policy assertions pass in `test/release-candidate-contract.test.mjs`; the full release/package gates pass.                         |
| AC-04     | Pass   | Focused six-test release suite, schema validation, fast gate, complete 13-gate delivery, Code/Test closure, matching receipt and diff checks pass. The changed-file audit contains only release guidance, candidate inventories/schemas, regression tests and ticket records. |

### Completion audit

All four criteria have direct current-source and executable evidence. The candidate contract matches
both the canonical runner and the shipped 1.1 services. Historical version records, runtime APIs,
dependencies and support durations are unchanged. No publishing, tagging, pushing or other external
write occurred. The first delivery failure remains documented with its table correction and green
rerun. Navigation decision and inspection work remain in their separate tickets.

Status: Complete

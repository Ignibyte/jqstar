---
id: 0001
title: Build the server-driven Data Table
status: done
created: 2026-08-30
updated: 2026-08-30
---

# 0001: Build the server-driven Data Table

## Plan

### Problem

The Data Table primitive supports local and manual processing, but the Project Browser proof only
shows search, single-column sorting, fixed four-row pagination, and stable selection. It does not
yet demonstrate the faceting, page sizing, column control, result metadata, and complete states
expected from a serious TanStack-style data grid.

### Current evidence

- `src/ui/data-table.ts` owns native sorting, filtering, pagination, selection, manual mode, and
  repeated enhancement.
- `registry/blocks/project-browser.*` composes Data Table and Pagination and sends query signals.
- `server/api.ts` reads those signals and returns official Datastar SDK signal and element patches.
- Existing unit, server, and Playwright tests prove search, sort, pagination, patching, and stable
  selection.

### Scope

- Extend Project Browser as the canonical server-driven Data Table block.
- Add a larger deterministic backend dataset.
- Add server-side status and owner facets.
- Add server-controlled page sizes and complete result-range metadata.
- Add column visibility without breaking table semantics.
- Preserve selection across Datastar row replacements and query changes.
- Provide loading, empty, error, responsive, and accessible states.
- Document how a real persistence backend can implement the same protocol.

### Out of scope

- Editing cells, drag column reordering, grouping, aggregation, virtualization, and database
  persistence.
- A JavaScript row-model API compatible with TanStack Table. This project competes through its
  HTML/server contract, not API imitation.

### Acceptance criteria

- [x] [AC-01] Users can search across project, owner, status, and description fields on the server.
- [x] [AC-02] Users can filter by owner and status, with allowlisted values handled by the server.
- [x] [AC-03] Users can sort every displayed data column in ascending, descending, and source order.
- [x] [AC-04] Users can choose 5, 10, or 20 rows per page and receive canonical page/range metadata.
- [x] [AC-05] Users can hide and restore nonessential columns while Project remains visible.
- [x] [AC-06] Selection remains stable by row ID across page, sort, filter, and server row patches.
- [x] [AC-07] Loading, empty results, result counts, active-filter state, and request errors are
      announced.
- [x] [AC-08] The table remains usable at mobile width and passes automated accessibility checks.
- [x] [AC-09] The backend uses `@starfederation/datastar-sdk` for every table response.
- [x] [AC-10] Unit, block, server, browser, accessibility, build, and full project checks pass.
- [x] [AC-11] Brain docs, public usage docs, backend docs, and this ticket match the delivered
      behavior.

### Design

Keep Data Table focused on generic table behavior. Extend the Project Browser block signals and
controls because facets, columns, and request orchestration are application composition concerns.
The backend will validate the complete signal set, filter and sort a deterministic in-memory
dataset, clamp the requested page, and patch signals, rows, and Pagination in one SDK stream.

Column visibility is client-owned presentation state because hiding a rendered column does not
change the server query. The block applies visibility to matching header and body cells after every
row patch. Project name and row selection cannot be hidden.

### Decisions

- Keep generic sort, filter, pagination, and selection behavior in Data Table. Keep facets, columns,
  and request orchestration in Project Browser.
- Keep query results and range metadata server-owned. Keep column visibility and stable selection
  client-owned across row patches.
- Generate every response through the official Datastar SDK and patch narrow stable targets.

### Risks

- Outer Pagination replacement must preserve its event action and be enhanced again.
- Row replacement must not clear selection stored by the Data Table controller.
- A hidden-column implementation must apply to future server-patched rows.
- Filter values and sort keys must be allowlisted before backend use.
- Mobile controls must not push the card beyond the viewport.

### Verification plan

- Expand block unit tests for signal payloads, facets, page size, visibility, and selection.
- Expand server tests to parse SDK events and prove filtering, sorting, page metadata, and invalid
  value normalization.
- Expand Playwright tests for the complete workflow, mobile containment, and axe checks.
- Run `npm run check` and `npm run test:package` before completion.

### Planned files

- `registry/blocks/project-browser.html`, `registry/blocks/project-browser.ts`, `registry.json`
- `server/api.ts`, `src/ui/theme.css`
- `test/project-browser-block.test.ts`, `test/server.test.ts`, `e2e/components.spec.ts`
- `README.md`, `docs/COMPONENT_ARCHITECTURE.md`, `docs/BACKEND.md`, this ticket

## Code

### Changed-file ledger

| File                                          | Purpose                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `AGENTS.md`, `docs/*.md`                      | Establish the project brain and required workflow.                                     |
| `registry/blocks/project-browser.html`        | Add facets, page sizing, column controls, table states, and denser source markup.      |
| `registry/blocks/project-browser.ts`          | Send complete query state and preserve client column/selection behavior after patches. |
| `server/api.ts`                               | Query 30 records and generate canonical Datastar SDK patches.                          |
| `src/ui/theme.css`                            | Style responsive table controls and the column menu.                                   |
| `registry.json`                               | Describe the expanded block contract.                                                  |
| `test/project-browser-block.test.ts`          | Verify signals, patches, columns, selection, and errors.                               |
| `test/server.test.ts`                         | Verify facets, search, page size, ranges, allowlists, and SDK output.                  |
| `e2e/components.spec.ts`                      | Verify the complete browser workflow, accessibility, and mobile containment.           |
| `README.md`, `docs/COMPONENT_ARCHITECTURE.md` | Document public usage and the delivered component contract.                            |

### Design changes

The existing Data Table controller did not need a new row-model API. Query orchestration and column
visibility remain in the block, which preserves the planned runtime/application boundary.

## Test

| Command                                                                                            | Result           | Evidence                                                                                            |
| -------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                | Passed           | Runtime and registry block types compile.                                                           |
| `npx vitest run test/project-browser-block.test.ts test/server.test.ts test/ui-data-table.test.ts` | Passed, 27 tests | Component, block, server, loading, empty, sorting, and page-size contracts pass.                    |
| `npx playwright test --grep 'project browser'`                                                     | Passed, 3 tests  | Desktop workflow, SDK patch accessibility, and mobile containment pass in Chromium.                 |
| `npm run check`                                                                                    | Passed           | Formatting, lint, types, 323 unit/integration tests, deployment proofs, and 73 Chromium tests pass. |
| `npm run test:package`                                                                             | Passed           | ESM, UMD, CSS, registry, CLI, and 251-file package contents pass.                                   |
| `npm run quality:fast`                                                                             | Pass             | Canonical workflow migration refresh; the current fast report supersedes the historical gate.       |
| `npm run quality:delivery`                                                                         | Pass             | Canonical workflow migration refresh; the current delivery report supersedes the historical gate.   |

### Inspection ledger

| Finding                                                                                          | Resolution                                                                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Facets and page sizing belonged to the application block, not the generic Data Table controller. | Project Browser owns the query controls and sends normalized signals to the server.       |
| Server row replacement could lose presentation state.                                            | Stable row IDs and post-patch column application preserve selection and visibility.       |
| Mobile controls could overflow the table card.                                                   | Browser geometry and axe checks cover the responsive layout before and after SDK patches. |

## Document

### Documentation changed

- Added the project brain index, definition, architecture, development, backend, testing, and
  workflow documents under `docs/`.
- Added `AGENTS.md` as the future-agent entry point.
- Updated `README.md` with manual Data Table and Project Browser usage.
- Updated `docs/COMPONENT_ARCHITECTURE.md` with the full block state and patch contract.
- Configured the npm package to publish the complete `docs/` directory.

### Acceptance evidence

| ID    | Evidence                                                              | Result |
| ----- | --------------------------------------------------------------------- | ------ |
| AC-01 | Server search tests cover project, owner, status, and description.    | Pass   |
| AC-02 | Server facet tests reject values outside the owner/status allowlists. | Pass   |
| AC-03 | All four keys, both directions, and source-order reset are tested.    | Pass   |
| AC-04 | Server tests and the Rows control cover 5, 10, and 20 row pages.      | Pass   |
| AC-05 | Block and browser tests hide and restore optional columns.            | Pass   |
| AC-06 | Block replacement and cross-query browser tests retain row IDs.       | Pass   |
| AC-07 | Loading, empty, count/filter signal, and failed-request tests pass.   | Pass   |
| AC-08 | Mobile geometry and axe checks pass before and after SDK patches.     | Pass   |
| AC-09 | Parsed `ServerSentEventGenerator` response tests cover the endpoint.  | Pass   |
| AC-10 | Focused, full, deployment, browser, and package commands pass.        | Pass   |
| AC-11 | `AGENTS.md`, `docs/`, `README.md`, and component docs were updated.   | Pass   |

### Completion audit

Status: Complete

The requested project brain exists and is linked from `AGENTS.md`. The reusable ticket template and
phase rules establish Plan → Code → Test → Document as the repository workflow. Ticket 0001 used
that workflow from scope through evidence.

The Project Browser is now the server-driven Data Table reference. Its endpoint uses the official
Datastar SDK and supports the planned query, presentation, state, responsive, and accessibility
requirements. Current focused, full, deployment, browser, and package gates pass. No acceptance
criterion remains open.

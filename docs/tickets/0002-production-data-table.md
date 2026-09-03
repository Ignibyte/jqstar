---
id: 0002
title: Complete the production Data Table
status: done
created: 2026-08-30
updated: 2026-08-30
---

# 0002: Complete the production Data Table

## Plan

### Problem

The Project Browser proves a reliable server-driven table, but it stops at the boundary recorded in
ticket 0001. It lacks durable storage, compound queries, hierarchical views, mutation handling,
column layout control, and bounded-DOM rendering for large result sets. Those gaps keep it from
serving as the project's production Data Table reference.

### Current evidence

- `src/ui/data-table.ts` supports local or manual filtering, one active sort, pagination, and stable
  selection.
- `registry/blocks/project-browser.*` owns the current server query and client column-visibility
  state.
- `server/api.ts` queries 30 process-local constants and has no mutation endpoint.
- Ticket 0001 explicitly excluded editing, column reordering, grouping, aggregation, virtualization,
  and database persistence.

### Scope

- Replace the process-local project array with a migration-managed SQLite project store.
- Support ordered multi-column sorting with an allowlisted SQL query plan.
- Support grouping by owner or status with aggregate counts and expandable group and row details.
- Support validated inline edits with optimistic concurrency and conflict recovery.
- Support persistent column order and left-pinned columns with pointer and keyboard controls.
- Support a server-windowed virtual mode with a bounded number of rendered rows.
- Preserve selection, focus, column state, and query state across Datastar patches.
- Publish the backend, operational, accessibility, performance, and extension contracts.

### Out of scope

- Authentication, tenancy, and authorization policy. The reference endpoint exposes a write-policy
  hook, but the host application owns identity and access decisions.
- Arbitrary user-authored SQL, computed formulas, spreadsheet behavior, or a TanStack-compatible
  JavaScript row-model API.
- A networked database adapter. The store interface is injectable so applications can provide one;
  the shipped reference is embedded SQLite for a single Node process.

### Acceptance criteria

- [x] [AC-01] The self-hosted server opens a file-backed SQLite database at a documented path,
      applies idempotent migrations, enables foreign keys and WAL where supported, and shuts down
      cleanly.
- [x] [AC-02] Tests can inject isolated in-memory or temporary-file databases without touching
      developer data.
- [x] [AC-03] A deterministic, idempotent seed supplies at least 2,500 records for realistic query
      and virtualization tests.
- [x] [AC-04] Search, facets, page/window bounds, group keys, sort keys, sort directions, and edit
      fields are validated before reaching SQL.
- [x] [AC-05] Users can build, reorder, reverse, and clear an ordered multi-column sort through
      mouse and keyboard controls; the server returns the matching deterministic order.
- [x] [AC-06] Users can group by owner or status, see aggregate row counts, and expand or collapse
      group rows without losing query or selection state.
- [x] [AC-07] Users can expand a project row to read its description and current version without
      invalid table markup.
- [x] [AC-08] Users can edit project name, owner, and status inline; invalid writes are announced
      and do not mutate storage.
- [x] [AC-09] Every edit includes an expected version. Concurrent edits return a conflict, preserve
      the stored value, and provide a clear reload-and-retry path.
- [x] [AC-10] Users can reorder optional columns and pin or unpin columns on the left with both
      pointer and keyboard-operable controls.
- [x] [AC-11] Column visibility, order, and pin state survive row patches and page reloads while
      required selection and Project columns remain available.
- [x] [AC-12] Virtual mode scrolls through the complete filtered result set while rendering no more
      than 80 data rows at once and avoiding stale out-of-order window patches.
- [x] [AC-13] Selection remains stable by project ID across page, virtual-window, sort, filter,
      group, expand, edit, and column changes.
- [x] [AC-14] Focus returns to a meaningful control after row patches, edit success, edit validation
      failure, and version conflict.
- [x] [AC-15] All table responses use the official Datastar SDK for signal and element patches.
- [x] [AC-16] Unit, store, migration, query, mutation, block, browser, accessibility, performance,
      deployment, and package gates pass.
- [x] [AC-17] Public and project-brain documentation matches the delivered runtime, storage, API,
      and operating model.

### Design

#### Storage

Add an injectable project-store boundary. The reference adapter uses `node:sqlite` on Node 24 or
newer, owns schema migrations, and stores data in `JQS_DATABASE_PATH`. The self-hosted default lives
outside build output so a rebuild cannot erase it. Tests use `:memory:` or a temporary file. Writes
run in transactions and use `version` in the update predicate for optimistic concurrency.

The embedded adapter is designed for one Node process. WAL improves read/write coexistence, but it
does not turn the reference server into a horizontally shared database. Applications that need
multiple writers implement the same store interface with their managed database.

#### Query protocol

Replace the single `sort` and `direction` pair with an ordered `sorts` array. Each entry contains an
allowlisted column key and direction. The store adds `id` as a final stable tie-breaker. Grouping is
an allowlisted `none`, `owner`, or `status` value. Page mode returns a page slice; virtual mode
returns an aligned window plus total row count and spacer metadata.

#### Rendering and state ownership

The server remains authoritative for query results, aggregates, row versions, and mutations. The
block owns column layout, expansion, request cancellation, and focus restoration because those are
presentation concerns. Column layout is serialized to versioned local storage and normalized against
the known schema on load.

Grouping uses semantic group header rows followed by project rows. Expanded project details use a
full-width companion row associated through `aria-controls` and `aria-expanded`. Virtual mode uses
top and bottom spacer rows inside a fixed-height scroll container and requests aligned windows as
scroll position changes.

#### Editing

An expanded project exposes an inline form. The mutation endpoint validates its JSON body, checks a
host-supplied write policy, and updates `WHERE id = ? AND version = ?`. Success patches the
canonical row and signals. A zero-row update becomes a version conflict and returns the current
record for a safe retry rather than overwriting it.

### Decisions

- Use an injectable store boundary with `node:sqlite` as the single-process reference adapter.
- Keep query results, aggregates, versions, and mutations server-owned. Keep column layout,
  expansion, cancellation, and focus restoration in Project Browser.
- Use fixed-height server windows for bounded rendering. Disable grouping and expansion in virtual
  mode because variable-height rows would invalidate the offset model.
- Expose a host write-policy hook without inventing authentication or tenancy inside the reference.

### Security and reliability constraints

- SQL identifiers and sort clauses come only from server-owned maps; user values use bound
  parameters.
- Request bodies retain the existing byte limit and reject invalid media types or malformed JSON.
- Error responses do not expose SQL, paths, or stack traces.
- Migration and seed operations are transactional and safe to run more than once.
- Window requests carry a monotonically increasing request number so stale responses cannot replace
  a newer view.
- Local-storage parsing tolerates corruption and schema evolution.

### Performance budgets

- Normal page queries return at most 200 data rows.
- Virtual responses return at most 80 data rows and the browser keeps at most 80 project rows in the
  DOM.
- The 95th percentile of 100 representative local SQLite list queries over the seeded dataset is
  under 75 ms in the test environment.
- The production block does not attach one global listener per data row.

### Risks

- SQL pagination and client expansion can diverge if row identity or ordering is unstable.
- Table virtualization can break semantics if spacer and detail rows use the wrong column span.
- Datastar morphing can replace the active editor or return focus to a removed element.
- Local column preferences can reference removed columns after an upgrade.
- Synchronous embedded database work can block the Node event loop under unsuitable workloads.
- Native drag behavior is not keyboard accessible without equivalent move controls.

### Verification plan

- Add store tests for migrations, seeding, query combinations, deterministic ordering, persistence,
  validation, transactions, and edit conflicts.
- Expand server tests for multi-sort, grouping, windows, mutations, write policy, and sanitized
  failures.
- Expand block tests for signal payloads, stale-window suppression, column-state normalization,
  expansion, editing, and focus.
- Add Chromium workflows for multi-sort, grouping, column movement/pinning, durable editing,
  conflicts, reload persistence, and virtual scrolling.
- Run axe before and after server patches and exercise keyboard-only workflows at desktop and mobile
  widths.
- Measure query latency and DOM row bounds with deterministic tests.
- Run `npm run check`, `npm run test:package`, and `git diff --check` before completion.

### Planned files

- `server/project-store.ts`, `server/api.ts`, `server/index.ts`
- `src/ui/data-table.ts`, `src/types.ts`, `src/index.ts`, `src/ui/theme.css`
- `registry/blocks/project-browser.html`, `registry/blocks/project-browser.ts`, `registry.json`
- `deploy/`, `scripts/smoke-deployment.mjs`, `scripts/smoke-server.mjs`
- Store, server, block, controller, and browser tests
- `README.md`, backend, self-hosting, component, testing, and project documentation

## Code

### Changed-file ledger

| Files                                                                                 | Purpose                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/project-store.ts`                                                             | Add the injectable SQLite store, migration, deterministic seed, bound query builder, aggregates, and optimistic update.                                        |
| `server/api.ts`, `server/index.ts`                                                    | Replace array queries, add normalized page/window/group/multi-sort signals, add versioned edits and write policy, expose database health, and close the store. |
| `src/ui/data-table.ts`, `src/types.ts`, `src/index.ts`                                | Add ordered additive sorting, priority metadata/API, accessible primary sort state, and delegated selection.                                                   |
| `registry/blocks/project-browser.*`                                                   | Add production signals and controls, grouping, expansion/editing, column persistence/reorder/pinning, and virtual scrolling.                                   |
| `src/ui/theme.css`                                                                    | Style pinned columns, groups, detail forms, sort priority, virtual rows, and responsive layout.                                                                |
| `deploy/*`, `scripts/smoke-*`, `.gitignore`, package metadata                         | Set the Node 24 floor, configure durable service state, verify database health, and keep local database files untracked.                                       |
| `test/project-store.test.ts`, server/block/controller tests, `e2e/components.spec.ts` | Prove storage, query, mutation, interaction, conflict, persistence, virtual bounds, accessibility, and mobile behavior.                                        |
| `README.md`, `docs/*`, `registry.json`                                                | Publish the component, endpoint, storage, operating, testing, and registry contracts.                                                                          |

### Design changes

The generic Data Table now owns ordered local/manual sort state and delegated selection. Project
Browser owns application presentation state: versioned column layout, group/row expansion, edit
forms, virtual-scroll scheduling, focus restoration, and cancellable requests. The backend owns all
query normalization, SQL construction, aggregates, canonical ranges, record versions, and writes.

The SQLite adapter applies a transactional schema migration, keeps baseline rows ahead of generated
seed rows without future sort-index collisions, uses bound values and allowlisted SQL identifiers,
and returns complete group counts alongside a bounded slice. The self-hosted process keeps the file
outside release output and reports database readiness through `/health`.

Virtual mode uses 52-pixel fixed data rows and at most 80 records per response. It disables grouping
and expansion because those variable-height rows would invalidate offset math. Page mode provides
the hierarchical and editing workflows. Stable row IDs keep selection independent of either mode.

## Test

| Command                                                                                                                       | Result           | Evidence                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx vitest run test/project-store.test.ts test/server.test.ts test/project-browser-block.test.ts test/ui-data-table.test.ts` | Passed, 40 tests | Store migrations/seeds/queries/conflicts/performance, API normalization/writes/policy, block state, and controller multi-sort pass.              |
| `npx playwright test --grep "project browser"`                                                                                | Passed, 5 tests  | Server facets, multi-sort, aggregates, conflict reload/retry, drag/pin reload persistence, virtual DOM bounds, axe, and mobile containment pass. |
| `npm run check`                                                                                                               | Passed           | Formatting, lint, types, 336 unit/integration tests, built deployment proofs, and all 75 Chromium tests pass.                                    |
| `npm run test:package`                                                                                                        | Passed           | ESM, UMD, CSS, registry, CLI, and 252-file package contents pass.                                                                                |
| `git diff --check`                                                                                                            | Passed           | No whitespace errors remain.                                                                                                                     |
| `npm run quality:fast`                                                                                                        | Pass             | Canonical workflow migration refresh; the current fast report supersedes the historical gate.                                                    |
| `npm run quality:delivery`                                                                                                    | Pass             | Canonical workflow migration refresh; the current delivery report supersedes the historical gate.                                                |

The 100-query seeded-dataset test measures the 95th percentile against the 75 ms budget. The browser
virtual-scroll proof renders 40 data rows, scrolls into a later window, and asserts that the DOM
never exceeds the 80-row limit while selection remains stable.

### Inspection ledger

| Finding                                                                            | Resolution                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Process-local arrays could not prove migration, persistence, or conflict behavior. | The injectable SQLite store has idempotent migrations, deterministic seeding, durable reopen tests, and versioned writes. |
| Unvalidated query fragments could reach SQL.                                       | Server-owned maps supply identifiers and clauses. User values remain bound parameters.                                    |
| Variable-height grouped/detail rows conflict with fixed-offset virtualization.     | Virtual mode uses fixed 52-pixel project rows and disables grouping and expansion.                                        |
| Row patches could leave stale requests or focus on removed elements.               | Monotonic request IDs suppress stale windows, and browser/block tests cover cancellation and focus restoration.           |

## Document

### Documentation changed

- `README.md` describes additive multi-sort and the complete persistent Project Browser.
- `docs/BACKEND.md` defines signals, allowlists, windows, mutation validation, conflict semantics,
  the store interface, and the single-process SQLite boundary.
- `docs/SELF_HOSTING.md` defines `JQS_DATABASE_PATH`, systemd state ownership, health, backup,
  restore, migration, and rollback operations.
- Project, architecture, development, testing, and component-architecture brain docs now reflect
  Node 24, SQLite, advanced table ownership, and required evidence.
- `registry.json` describes the delivered Data Table and Project Browser capabilities.

### Acceptance evidence

| ID    | Evidence                                                                                       | Result |
| ----- | ---------------------------------------------------------------------------------------------- | ------ |
| AC-01 | File reopen, migration, WAL/foreign-key, shutdown, health, and service-state evidence passes.  | Pass   |
| AC-02 | Store tests use isolated in-memory and temporary-file databases.                               | Pass   |
| AC-03 | Migration/seed tests prove an idempotent deterministic 2,500-record dataset.                   | Pass   |
| AC-04 | Store and server tests cover every query, window, grouping, sorting, and edit allowlist.       | Pass   |
| AC-05 | Controller, block, server, and browser tests cover ordered additive multi-sort.                | Pass   |
| AC-06 | Group aggregates and expansion pass store, block, server, and browser tests.                   | Pass   |
| AC-07 | Semantic companion-row markup exposes project descriptions and versions.                       | Pass   |
| AC-08 | Validation tests prove invalid edits are announced without changing storage.                   | Pass   |
| AC-09 | Real concurrent edits return `409`, retain stored data, and support reload/retry.              | Pass   |
| AC-10 | Keyboard move, pointer drag, pin, and unpin workflows pass.                                    | Pass   |
| AC-11 | Valid and corrupt local-storage reloads preserve or safely normalize column layout.            | Pass   |
| AC-12 | Server windows and browser DOM remain at or below 80 project rows.                             | Pass   |
| AC-13 | Delegated stable IDs preserve selection across every page and virtual operation.               | Pass   |
| AC-14 | Block and browser tests restore focus after patches, validation, success, and conflict.        | Pass   |
| AC-15 | Parsed SDK-event tests cover every table response path.                                        | Pass   |
| AC-16 | Unit, store, server, block, browser, accessibility, performance, deployment, and package pass. | Pass   |
| AC-17 | Public, backend, self-hosting, architecture, testing, and project documentation was updated.   | Pass   |

### Completion audit

Status: Complete

Every acceptance criterion is implemented and has test or operational evidence. The historical
ticket 0001 exclusions—database persistence, multi-sort, grouping/aggregation, expansion, editing,
column reordering/pinning, and virtualization—are now delivered. Authentication, tenancy, and a
networked multi-writer database remain explicit host-application responsibilities rather than hidden
omissions.

The final full gate and package gate passed after the last controller performance change. No code,
test, documentation, deployment, or acceptance task remains open in this ticket.

# Development guide

## Requirements and setup

Use Node 24 or newer. The reference project store uses the built-in `node:sqlite` module.

```sh
npm ci
npm run demo
```

The framework home runs at `http://127.0.0.1:4173/` when started by Playwright. Documentation begins
at `/docs/`, and the exhaustive Component Lab is `/components/lab/`. The pages are native HTML and
use `example/site.ts` only for jQStar installation and site-specific actions. Vite installs the
proof backend from `server/api.ts`, so Component Lab browser work exercises the same handlers as the
standalone server.

## Common commands

| Command                           | Purpose                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run demo`                    | Start the jQStar website, Component Lab, and proof backend.       |
| `npm run test:unit`               | Run Vitest unit and integration tests.                            |
| `npm run test:e2e`                | Run browser behavior and accessibility tests.                     |
| `npm run test:webmcp:native`      | Run zero-mock WebMCP proof in flagged Chromium.                   |
| `npm run typecheck`               | Check runtime and registry block TypeScript.                      |
| `npm run lint`                    | Run ESLint over source, server, tests, and scripts.               |
| `npm run format:check`            | Verify Prettier formatting.                                       |
| `npm run build`                   | Build package JavaScript, declarations, and CSS.                  |
| `npm run build:agent-content`     | Validate and regenerate the public agent corpus.                  |
| `npm run test:self-hosted`        | Build and smoke-test standalone deployment.                       |
| `npm run test:package`            | Verify publish artifacts and package boundaries.                  |
| `npm run quality:fast`            | Run the short edit-loop gate.                                     |
| `npm run quality:delivery`        | Run the commit and merge gate and write a matching receipt.       |
| `npm run quality:full-audit`      | Run the complete scheduled and release-candidate audit.           |
| `npm run quality:static`          | Run census, typed, architecture, source, and documentation gates. |
| `npm run quality:static:delivery` | Add local security and external-tool sabotage gates.              |
| `npm run quality:static:self`     | Prove every custom source detector and scope selector.            |
| `npm run quality:census`          | Verify every operated artifact has exactly one evidence class.    |
| `npm run test:coverage`           | Enforce global, subsystem, and 100% changed-code coverage.        |
| `npm run test:property`           | Run deterministic properties with the committed replay seed.      |
| `npm run test:property:audit`     | Run an acknowledged random property seed and record it.           |
| `npm run test:quality:self`       | Prove coverage, property, and census detectors fail red.          |
| `npm run test:browser:quality`    | Run the exact eight-project browser quality matrix.               |
| `npm run test:package:quality`    | Test the installed tarball, types, API, sizes, and browsers.      |
| `npm run test:release:quality`    | Rebuild in two clean workspaces and verify release evidence.      |
| `npm run test:quality:0044`       | Prove browser, package, budget, and release detectors stay live.  |
| `npm run check`                   | Compatibility alias for `npm run quality:delivery`.               |

## Change rules

1. Open or create a ticket under `docs/tickets/` before changing product behavior.
2. Record current behavior and acceptance criteria in the Plan section.
3. Keep runtime behavior generic. Put application-specific orchestration in a registry block.
4. Preserve native semantics and form behavior before adding custom state.
5. Treat stable data attributes, named actions, events, and TypeScript types as public API.
6. Add focused tests with the code. Use browser tests for keyboard, responsive, server, or
   accessibility behavior that jsdom cannot prove.
7. Run the smallest relevant test during iteration, then `npm run quality:fast` before leaving Code.
8. Run `npm run quality:delivery` before closing Test. Do not reuse its result after editing a gated
   file.
9. Update user documentation and ticket evidence after tests pass. Map every `[AC-NN]` criterion to
   exactly one evidence row; checked criteria use `Pass`, while an approved exclusion remains
   unchecked and uses `Approved-Disposition`.
10. Add `Status: Complete` only after the current-state audit, mark the ticket `done`, and rerun
    `npm run quality:delivery` so the receipt covers the final documentation and status.

## Agent-content authoring

`config/agent-content.json` is the reviewed source manifest. It names the allowed public guides,
examples, invariants, limits, evaluations, and canonical URLs. `scripts/build-agent-content.mjs`
joins it with `package.json`, `registry.json`, registry source, and selected public HTML. It writes
the visible agent guide, the short and full text files, the public JSON index, and a byte-identical
module-side index used only for static typing.

Do not edit those generated files directly. Change the public source or manifest, then run:

```sh
npm run build:agent-content
npm run build:agent-content -- --check
```

The generator rejects missing or private source paths, conflicting package or registry metadata,
oversized records, changed verified examples, and stale output. Add retrieval questions to the
manifest evaluation set when a public capability changes. Keep WebMCP orchestration in `example/`;
it may read only this approved local corpus and must stay optional, bounded, cancellable, and
read-only unless a later ticket defines a new security boundary.

## Quality reports and recovery

Quality runs keep their source scope, logs, JSON report, and any receipt in `.git/jqstar/`. These
files are local evidence and do not dirty the worktree. The report lists every configured gate in a
stable order, including conditional gates that were skipped.

Coverage and property gates write JSON evidence into the active run's `evidence/` directory.
Standalone commands use `test-results/quality/`, while standalone coverage detail also uses
`coverage/quality/`. Both locations are transient and ignored. Coverage always deletes its old
detail before running. To replay a property failure, pass the recorded seed and path, for example:

```sh
npm run test:property -- --seed 430043 --property sse-chunk-boundaries --path '3:1:0'
```

`npm run test:property:audit` is deliberately acknowledged. It chooses a fresh seed for that run and
writes it to `property-audit-gate.json` so a failure is reproducible.

Mutation testing is not installed and does not run in any quality mode. Reintroducing it requires an
explicit user request and a separate quality ticket.

When a run fails, open `.git/jqstar/latest-report.json`, then read the named log under that run's
`logs/` directory. Install a missing tool with `npm ci`. Correct an empty test selector or malformed
report rather than rerunning it as a pass. A timeout or killed child is an error and must be rerun
after its cause is fixed.

GitHub Actions sets `JQS_QUALITY_BASE_SHA` to the pull-request base commit or the previous pushed
commit. The runner resolves it to a commit, requires it to be an ancestor of `HEAD`, and combines
the committed `base...HEAD` diff with worktree and untracked changes. The resolved base is recorded
in the immutable scope and final report. Standalone runs leave the variable unset and retain the
local `HEAD`-to-worktree behavior. An invalid or non-ancestor base fails before any gate runs.

SIGINT or SIGTERM stops the canonical runner from launching later stages. The active process group
is terminated, every configured gate that did not start is recorded as an interruption error, the
red report is written, and no receipt is issued.

Nested browser commands use the same supervised process runner. When a direct command exits, the
runner terminates descendants that still hold its output pipes. A timeout also walks detached
descendants before signaling the process group. Installed-package browsers have separate 30-second
launch, 90-second proof, and 5-second cleanup bounds. Exceeding any bound is an error, not a skip.
Quality browser runs stop after the first test still failing after retries. Passing projects must
still execute their complete selected count.

The static runner writes `static-report.json` and one analyzer log below the active quality run
directory. A standalone invocation uses `.git/jqstar/static-runs/`. It attempts every selected
analyzer before printing its ordered verdict, so one failure cannot hide later findings. SIGINT or
SIGTERM terminates the active analyzer process group, records every unstarted analyzer as an error,
writes the interrupted report, and exits nonzero.

The delivery static gate also requires Semgrep 1.166, gitleaks 8.30, OSV-Scanner 2.5, ShellCheck,
and actionlint 1.7 on `PATH`. Missing binaries are errors. The repository pins JavaScript analyzers
in `package-lock.json`; install them with `npm ci`. CI installs the same external analyzers before
calling the repository command.

`quality/scopes.json` assigns every tracked or unignored file to exactly one scope. New file types
must be added there with their validators. `quality/deviations.json` is the only exception process.
Inline suppressions, skipped tests, broad source ignores, and generated baselines fail the source
policy. A deviation identifies one rule and source range, includes approval and removal evidence,
and remains unexpired and attached to a live source marker.

Any gated edit invalidates the delivery receipt. Run `npm run quality:delivery` again after code,
test, documentation, gate configuration, or tracked metadata changes. The same rule applies after
`HEAD` changes, which prevents one receipt from authorizing a later commit.

`ticket:validate --phase code` accepts only a schema-valid current `quality:fast` report.
`ticket:validate --phase test` accepts only a schema-valid current `quality:delivery` report that is
the report named by the matching receipt. The Document phase uses stable criterion IDs and rejects
missing, duplicate, unknown, or unmapped evidence rows. A receipt proves quality for an exact state;
ticket completion is proven separately and the final `done` edit requires a fresh receipt.

The optional commit guard is explicit and reversible:

```sh
npm run quality:guard:install
npm run quality:guard:status
npm run quality:guard:uninstall
```

It refuses to replace an existing custom hooks path. GitHub Actions starts from `npm ci`, installs
the required browsers, runs the same delivery or full-audit command, and retains `.git/jqstar/`
whether the run is green or red.

## Adding a UI component

- Add the controller under `src/ui/` and wire it through `src/ui/index.ts`.
- Add public types to `src/types.ts` and export them from `src/index.ts`.
- Add the source recipe under `registry/components/`.
- Add the registry entry and dependencies to `registry.json`.
- Document its contract in `README.md` and `docs/COMPONENT_ARCHITECTURE.md`.
- Add unit behavior tests and Playwright interaction/accessibility proof.

## Adding a server-driven block

- Compose existing registry components before adding new primitives.
- Keep its action module beside its HTML in `registry/blocks/`.
- Give the endpoint through a `data-*` attribute so consuming applications can replace it.
- Send typed signal payloads with `$.star.get` or another backend action.
- Generate SSE with the official Datastar SDK.
- Patch narrow stable targets and make replacement markup safe to enhance repeatedly.
- Cover the action module with a mocked SDK response, the endpoint with server tests, and the full
  workflow with Playwright.

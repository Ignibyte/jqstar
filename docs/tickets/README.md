# Ticket workflow

Every product change moves through four phases in one ticket: Plan → Code → Test → Document. The
ticket is the decision record and evidence ledger. It is not a substitute for tests or user docs.

The ordered expansion program is tracked in [ROADMAP.md](ROADMAP.md). Conditional implementation
tickets remain planned until their named decision ticket approves the work. A decision that rejects
the work marks each named conditional ticket `declined` and links the evidence-backed alternative.

## Ticket states

- `planned`: scope and acceptance criteria are written. Product code has not started.
- `coding`: implementation is in progress and the changed-file ledger is current.
- `testing`: implementation is complete enough for focused and full verification.
- `documenting`: tests pass and public/internal documentation is being updated.
- `done`: every acceptance criterion has direct evidence and no required work remains.
- `declined`: a named decision ticket rejected conditional work, documented the supported
  alternative, and verified that no partial public surface shipped.
- `blocked`: progress requires a named external decision or state change.

Only one phase is active. Update the ticket status when crossing a phase boundary. `done` and
`declined` are terminal states. Reopening either requires a new decision record and a return to
`planned`.

## Phase requirements

### Plan

Record the problem, current behavior, boundaries, acceptance criteria, implementation design,
security/accessibility concerns, planned-file manifest, and verification plan. Resolve material
unknowns from repository evidence before coding.
`npm run ticket:validate -- --phase plan --ticket docs/tickets/NNNN-name.md` refuses a phase closure
when any required field is missing.

### Code

Implement the planned behavior. Keep a changed-file ledger with the purpose of each change. If the
design changes, update the Plan section before continuing so the ticket matches reality. Record a
passing `quality:fast` report before moving the ticket to `testing`.

```sh
npm run ticket:validate -- --phase code --ticket docs/tickets/NNNN-name.md \
  --report .git/jqstar/latest-report.json
```

### Test

Run focused checks first, then the complete gate. Record each command, result, and what it proves.
Failures remain in the ledger with the corrective action. Do not erase useful failure history.
Record independent inspection findings and their resolution. A ticket cannot move to `documenting`
without a passing `quality:delivery` report that executed at least one enforced test gate.

```sh
npm run ticket:validate -- --phase test --ticket docs/tickets/NNNN-name.md \
  --report .git/jqstar/latest-report.json
```

### Document

Update public usage, architecture, backend contracts, and operational notes affected by the change.
Fill the acceptance evidence table with file references and test results. Mark the ticket `done`
only after a current-state audit. Give every criterion a stable ID such as `[AC-01]` and use that
same ID exactly once in the Acceptance evidence table. A checked criterion requires `Pass`; an
intentionally unchecked criterion requires `Approved-Disposition`. Finish the audit with
`Status: Complete` on its own line. Duplicated, missing, unknown, or unmapped evidence IDs and
negated prose such as “not complete” fail validation.

## Machine enforcement

The repository owns three fixed gate modes:

| Command                      | Use                                                         | Writes a receipt |
| ---------------------------- | ----------------------------------------------------------- | ---------------- |
| `npm run quality:fast`       | The normal edit loop. It runs quick required checks.        | No               |
| `npm run quality:delivery`   | Required before commit or merge. It checks the exact tree.  | Yes, when green  |
| `npm run quality:full-audit` | Scheduled and release proof, including the expensive lanes. | Yes, when green  |

Each run records `jqstar-quality-report/1` JSON, one isolated log per gate, and the immutable
startup scope under `.git/jqstar/runs/<run-id>/`. `.git/jqstar/latest-report.json` contains the
latest result. A delivery receipt exists only when every enforced gate passes, at least one test
gate executes, the reports can be written, and the start and end fingerprints match.

`pass`, `fail`, `error`, and `skip` have distinct meanings. A skip records why a conditional gate
did not run. It is never counted as a pass. Missing tools, timeouts, killed processes, unreadable
evidence, empty required suites, and recording failures are errors and cannot authorize delivery.

The optional local commit guard checks `.git/jqstar/quality-receipt.json`:

```sh
npm run quality:guard:install
npm run quality:guard:status
npm run quality:guard:uninstall
```

Installation is explicit and refuses to replace another `core.hooksPath`. The hook runs only for a
Git commit. Read-only operations such as status, diff, fetch, and checkout are unaffected. CI runs
the same repository commands and remains authoritative whether or not the local guard is installed.

## Naming

Use `NNNN-short-description.md`. Numbers are sequential and never reused. Copy
[TEMPLATE.md](TEMPLATE.md) for a new ticket.

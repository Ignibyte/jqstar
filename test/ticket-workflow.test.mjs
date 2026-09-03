import assert from "node:assert/strict";
import test from "node:test";
import { inspectPhaseReport, inspectTicket } from "../scripts/quality/lib/ticket.mjs";

function ticket(status, additions = "") {
  return `---
id: 9999
title: Fixture
status: ${status}
created: 2026-08-30
updated: 2026-08-30
---

# Fixture

## Plan

### Problem

A measurable problem.

### Current evidence

The command exits zero today.

### Scope

Change the command.

### Out of scope

No public API changes.

### Acceptance criteria

- [x] [AC-01] The command rejects an empty scope.

### Design

Use a repository-owned script.

### Decisions

- Keep the detector local and fail closed.

### Risks

An empty selector could pass silently.

### Verification plan

Run the planted empty fixture.

### Planned files

- scripts/fixture.mjs

## Code

### Changed-file ledger

| File | Purpose |
| --- | --- |
| scripts/fixture.mjs | Enforce the rule. |

### Design changes

No changes from the plan.

## Test

| Command | Result | Evidence |
| --- | --- | --- |
| npm run quality:fast | Pass | Report A |
| npm run quality:delivery | Pass | Report B with an enforced test gate |

### Inspection ledger

| Finding | Resolution |
| --- | --- |
| Empty selection | Added a refusal. |

## Document

### Documentation changed

- docs/DEVELOPMENT.md

### Acceptance evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC-01 | Sabotage test | Pass |

### Completion audit

Status: Complete

Every criterion has current evidence.
${additions}`;
}

test("all four phase closures accept a complete ticket", () => {
  assert.deepEqual(inspectTicket(ticket("done")).errors, []);
});

test("Plan refuses missing required evidence and file manifest", () => {
  const result = inspectTicket(ticket("coding").replace("- scripts/fixture.mjs", "Pending"));
  assert.ok(result.errors.some((error) => error.includes("Planned files")));
});

test("Code refuses a placeholder ledger and missing fast proof", () => {
  const markdown = ticket("testing")
    .replace(
      "| scripts/fixture.mjs | Enforce the rule. |",
      "| _None yet_ | Implementation has not started. |",
    )
    .replace("npm run quality:fast", "npm run test:unit");
  const result = inspectTicket(markdown);
  assert.ok(result.errors.some((error) => error.includes("changed-file ledger")));
  assert.ok(result.errors.some((error) => error.includes("quality:fast")));
});

test("Test refuses missing inspection and delivery proof", () => {
  const markdown = ticket("documenting")
    .replace("| Empty selection | Added a refusal. |", "| Finding | Resolution |")
    .replace("npm run quality:delivery", "npm run test:package");
  const result = inspectTicket(markdown);
  assert.ok(result.errors.some((error) => error.includes("inspection ledger")));
  assert.ok(result.errors.some((error) => error.includes("quality:delivery")));
});

test("current phase evidence closes Code and Test before its ledger citation is added", () => {
  const fastReport = {
    schema: "jqstar-quality-report/1",
    status: "pass",
    mode: "fast",
    gates: [],
  };
  const withoutFastCitation = ticket("coding").replace("npm run quality:fast", "npm run test:unit");
  assert.deepEqual(
    inspectTicket(withoutFastCitation, { requestedPhase: "code", phaseReport: fastReport }).errors,
    [],
  );

  const deliveryReport = {
    schema: "jqstar-quality-report/1",
    status: "pass",
    mode: "delivery",
    gates: [{ id: "unit", kind: "test", enforced: true, status: "pass" }],
  };
  const withoutDeliveryCitation = ticket("testing").replace(
    "npm run quality:delivery",
    "npm run test:package",
  );
  assert.deepEqual(
    inspectTicket(withoutDeliveryCitation, {
      requestedPhase: "test",
      phaseReport: deliveryReport,
    }).errors,
    [],
  );
});

test("Document refuses incomplete acceptance evidence", () => {
  const markdown = ticket("done").replace("| AC-01 | Sabotage test | Pass |", "Pending");
  const result = inspectTicket(markdown);
  assert.ok(result.errors.some((error) => error.includes("evidence row for AC-01")));
});

test("Document binds one evidence row to each stable criterion ID", () => {
  const duplicated = ticket("done").replace(
    "| AC-01 | Sabotage test | Pass |",
    "| AC-01 | First claim | Pass |\n| AC-01 | Duplicate claim | Pass |",
  );
  assert.ok(
    inspectTicket(duplicated).errors.some((error) =>
      error.includes("exactly one evidence row for AC-01"),
    ),
  );

  const unmapped = ticket("done").replace("| AC-01 |", "| AC-99 |");
  const errors = inspectTicket(unmapped).errors;
  assert.ok(errors.some((error) => error.includes("unknown criterion AC-99")));
  assert.ok(errors.some((error) => error.includes("evidence row for AC-01")));
});

test("Document locates one explicit result cell independent of column order", () => {
  const outcomeFirst = ticket("done")
    .replace("| Criterion | Evidence | Result |", "| ID | Outcome | Evidence |")
    .replace("| AC-01 | Sabotage test | Pass |", "| AC-01 | Pass | Sabotage test |");
  assert.deepEqual(inspectTicket(outcomeFirst).errors, []);

  const missingResult = outcomeFirst.replace(
    "| AC-01 | Pass | Sabotage test |",
    "| AC-01 | Green-looking prose | Sabotage test |",
  );
  assert.ok(
    inspectTicket(missingResult).errors.some((error) => error.includes("exactly one result cell")),
  );
});

test("Document rejects unchecked passing criteria and negated completion prose", () => {
  const unchecked = ticket("done").replace("- [x] [AC-01]", "- [ ] [AC-01]");
  assert.ok(
    inspectTicket(unchecked).errors.some((error) =>
      error.includes("checked with Pass or unchecked with Approved-Disposition"),
    ),
  );

  const negated = ticket("done").replace(
    "Status: Complete\n\nEvery criterion has current evidence.",
    "This ticket is not complete.",
  );
  assert.ok(inspectTicket(negated).errors.some((error) => error.includes("Status: Complete")));
});

test("phase reports must match the phase and execute a real test", () => {
  const base = {
    schema: "jqstar-quality-report/1",
    status: "pass",
    mode: "delivery",
    gates: [{ id: "unit", kind: "test", enforced: true, status: "pass" }],
  };
  assert.deepEqual(inspectPhaseReport({ ...base, mode: "fast" }, "code"), []);
  assert.deepEqual(inspectPhaseReport(base, "test"), []);
  assert.ok(
    inspectPhaseReport({ ...base, mode: "fast" }, "test").some((error) =>
      error.includes("delivery"),
    ),
  );
  assert.ok(
    inspectPhaseReport(
      { ...base, gates: [{ id: "unit", kind: "test", enforced: true, status: "skip" }] },
      "test",
    ).some((error) => error.includes("enforced test")),
  );
});

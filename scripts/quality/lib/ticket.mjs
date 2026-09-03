const orderedStatuses = ["planned", "coding", "testing", "documenting", "done"];
const terminalStatuses = new Set(["declined", "blocked"]);

function frontMatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => /^([a-z-]+):\s*(.+)$/.exec(line))
      .filter(Boolean)
      .map((entry) => [entry[1], entry[2].trim()]),
  );
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `^${escaped}[^\\S\\n]*\\n([\\s\\S]*?)(?=^#{1,3}\\s|(?![\\s\\S]))`,
    "m",
  ).exec(markdown);
  return match?.[1]?.trim() ?? "";
}

function meaningful(value) {
  return Boolean(
    value &&
    !/^(pending|none recorded|pending implementation|implementation has not started\.?|_none yet_)/i.test(
      value,
    ),
  );
}

function dataRows(value) {
  return value
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => !/^\|[\s:|-]+\|\s*$/.test(line))
    .filter((line) => !/^\|\s*(file|command|criterion|finding|id)\s*\|/i.test(line));
}

function tableCells(row) {
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function acceptanceCriteria(markdown) {
  return [
    ...section(markdown, "### Acceptance criteria").matchAll(
      /^- \[([ x])\]\s+(?:\[([A-Z][A-Z0-9-]*-\d{2})\]\s+)?(.+)$/gm,
    ),
  ].map(([, checked, id, text]) => ({ checked: checked === "x", id, text }));
}

function usableRows(value) {
  return dataRows(value).filter(
    (row) => !/(_none yet_|pending|not run|implementation has not started)/i.test(row),
  );
}

function hasPassingCommand(markdown, command) {
  return dataRows(section(markdown, "## Test")).some(
    (row) => row.includes(command) && /\|\s*(pass|passed|green)\s*\|/i.test(row),
  );
}

export function inspectTicket(markdown, { requestedPhase, phaseReport } = {}) {
  const metadata = frontMatter(markdown);
  const errors = [];
  const status = metadata.status;
  if (!status || (!orderedStatuses.includes(status) && !terminalStatuses.has(status))) {
    errors.push("front matter has an unsupported status");
    return { metadata, errors };
  }
  if (terminalStatuses.has(status)) return { metadata, errors };

  const statusIndex = orderedStatuses.indexOf(status);
  const requestedIndex = requestedPhase
    ? ["plan", "code", "test", "document"].indexOf(requestedPhase) + 1
    : statusIndex;
  const phaseIndex = Math.max(statusIndex, requestedIndex);

  if (phaseIndex >= 1) {
    for (const heading of [
      "### Problem",
      "### Current evidence",
      "### Scope",
      "### Out of scope",
      "### Design",
      "### Decisions",
      "### Risks",
      "### Verification plan",
      "### Planned files",
    ]) {
      if (!meaningful(section(markdown, heading)))
        errors.push(`Plan is missing ${heading.slice(4)}`);
    }
    const requirements = acceptanceCriteria(markdown);
    if (requirements.length === 0)
      errors.push("Plan needs at least one testable acceptance criterion");
  }

  if (phaseIndex >= 2) {
    const ledger = section(markdown, "### Changed-file ledger");
    if (!meaningful(ledger) || usableRows(ledger).length === 0) {
      errors.push("Code needs a current changed-file ledger");
    }
    if (!meaningful(section(markdown, "### Design changes"))) {
      errors.push("Code needs a design-change record, including an explicit 'No changes' entry");
    }
    const currentFastProof =
      requestedPhase === "code" && inspectPhaseReport(phaseReport, "code").length === 0;
    if (!currentFastProof && !hasPassingCommand(markdown, "quality:fast")) {
      errors.push("Code needs a passing quality:fast result in the Test ledger");
    }
  }

  if (phaseIndex >= 3) {
    const inspection = section(markdown, "### Inspection ledger");
    if (!meaningful(inspection) || usableRows(inspection).length === 0) {
      errors.push("Test needs a non-empty inspection ledger");
    }
    const currentDeliveryProof =
      requestedPhase === "test" && inspectPhaseReport(phaseReport, "test").length === 0;
    if (!currentDeliveryProof && !hasPassingCommand(markdown, "quality:delivery")) {
      errors.push("Test needs a passing quality:delivery result in the Test ledger");
    }
  }

  if (phaseIndex >= 4) {
    if (!meaningful(section(markdown, "### Documentation changed"))) {
      errors.push("Document needs the affected public and internal documentation list");
    }
    const evidence = section(markdown, "### Acceptance evidence");
    const criteria = acceptanceCriteria(markdown);
    const missingIds = criteria.filter((criterion) => !criterion.id);
    if (missingIds.length > 0) {
      errors.push(`Document has ${missingIds.length} acceptance criteria without stable IDs`);
    }
    const criterionIds = criteria.map((criterion) => criterion.id).filter(Boolean);
    if (new Set(criterionIds).size !== criterionIds.length) {
      errors.push("Document has duplicate acceptance criterion IDs");
    }
    const evidenceEntries = dataRows(evidence).map((row) => {
      const cells = tableCells(row);
      const results = cells
        .slice(1)
        .filter((cell) => /^(pass|passed|approved(?:[ -]disposition)?)$/i.test(cell));
      return { id: cells[0], result: results[0], resultCount: results.length };
    });
    const knownIds = new Set(criterionIds);
    for (const entry of evidenceEntries) {
      if (entry.id && !knownIds.has(entry.id)) {
        errors.push(`Document evidence references unknown criterion ${entry.id}`);
      }
    }
    for (const criterion of criteria) {
      if (!criterion.id) continue;
      const matches = evidenceEntries.filter((entry) => entry.id === criterion.id);
      if (matches.length !== 1) {
        errors.push(
          `Document needs exactly one evidence row for ${criterion.id}; found ${matches.length}`,
        );
        continue;
      }
      const result = matches[0].result ?? "";
      if (matches[0].resultCount !== 1) {
        errors.push(`Document evidence for ${criterion.id} needs exactly one result cell`);
        continue;
      }
      const passed = /^(pass|passed)$/i.test(result);
      const disposition = /^approved(?:[ -]disposition)?$/i.test(result);
      if ((criterion.checked && !passed) || (!criterion.checked && !disposition)) {
        errors.push(
          `Document criterion ${criterion.id} must be checked with Pass or unchecked with Approved-Disposition`,
        );
      }
    }
    const audit = section(markdown, "### Completion audit");
    if (!meaningful(audit) || !/^Status:\s*Complete\s*$/im.test(audit)) {
      errors.push("Document needs a standalone 'Status: Complete' current-state audit marker");
    }
  }

  return { metadata, errors };
}

export function inspectPhaseReport(report, phase) {
  const errors = [];
  if (report?.schema !== "jqstar-quality-report/1" || report.status !== "pass") {
    return ["phase evidence is not a passing jqstar-quality-report/1 report"];
  }
  const expectedMode = phase === "code" ? "fast" : "delivery";
  if (report.mode !== expectedMode)
    errors.push(`${phase} requires a passing ${expectedMode} report`);
  if (
    phase === "test" &&
    !report.gates?.some(
      (gate) => gate.enforced === true && gate.kind === "test" && gate.status === "pass",
    )
  ) {
    errors.push("Test closure report did not execute and pass an enforced test gate");
  }
  return errors;
}

import assert from "node:assert/strict";
import { closedObject, safeRelativePath, sameKeys, sha256 } from "./contracts.mjs";

const normalized = (value) => value.replace(/\s+/gu, " ").trim();
const terminal = new Set(["done", "declined"]);
const dispositions = new Set(["Pass", "Approved-Disposition"]);

function section(source, heading) {
  const marker = `${heading}\n`;
  const index = source.indexOf(marker);
  assert(index >= 0 && source.indexOf(marker, index + 1) < 0, `Missing or repeated ${heading}`);
  return source.slice(index + marker.length).split(/^#{1,3} /mu)[0];
}

function metadata(source, key) {
  const front = /^---\n([\s\S]*?)\n---\n/u.exec(source)?.[1];
  assert(front, "Ticket front matter is missing");
  const matches = [...front.matchAll(new RegExp(`^${key}: (.+)$`, "gmu"))];
  assert(matches.length === 1, `Missing or repeated ticket ${key}`);
  return matches[0][1].trim();
}

export function ticketRequirements(path, source) {
  const digest = sha256(source);
  source = source.replace(/\r\n/gu, "\n");
  safeRelativePath(path);
  const id = metadata(source, "id");
  assert(/^\d{4}$/u.test(id) && path.startsWith(`docs/tickets/${id}-`), "Ticket identity mismatch");
  const status = metadata(source, "status");
  assert(
    ["planned", "coding", "testing", "documenting", "done", "declined", "blocked"].includes(status),
    "Unsupported ticket status",
  );
  const role = id === "0033" ? "self" : id === "0053" ? "deferred" : "prerequisite";
  const declarations = [
    ...section(source, "### Acceptance criteria").matchAll(
      /^- \[([ x])\] \[(AC-\d{2})\][ \t]*(.*(?:\n[ \t]+[^\n]+)*)/gmu,
    ),
  ];
  assert(declarations.length > 0, `${id}: no acceptance criteria`);
  assert(
    declarations.length ===
      [...section(source, "### Acceptance criteria").matchAll(/^- \[/gmu)].length,
    `${id}: unparsed acceptance criterion`,
  );
  assert(
    new Set(declarations.map((row) => row[2])).size === declarations.length,
    `${id}: duplicate criteria`,
  );
  const evidence = [
    ...section(source, "### Acceptance evidence").matchAll(/^\|\s*(AC-\d{2})\s*\|(.+)$/gmu),
  ].map((match) => {
    const cells = match[2]
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const results = cells.filter((cell) => dispositions.has(cell));
    return {
      id: match[1],
      results,
      text: cells.filter((cell) => !dispositions.has(cell)).join(" | "),
    };
  });
  assert(
    new Set(evidence.map((row) => row.id)).size === evidence.length,
    `${id}: duplicate evidence`,
  );
  assert(
    evidence.length ===
      [...section(source, "### Acceptance evidence").matchAll(/^\|\s*AC-/gmu)].length,
    `${id}: unparsed acceptance evidence`,
  );
  if (role === "prerequisite") {
    assert(terminal.has(status), `${id}: nonterminal prerequisite`);
    assert(
      /^Status: Complete$/mu.test(section(source, "### Completion audit")),
      `${id}: incomplete closure`,
    );
    assert(evidence.length === declarations.length, `${id}: evidence count mismatch`);
  }
  const requirements = declarations.map(([, checked, criterion, text]) => {
    assert(normalized(text).length > 0, `${id}:${criterion}: empty requirement`);
    const row = evidence.find((item) => item.id === criterion);
    const expected = checked === "x" ? "Pass" : "Approved-Disposition";
    if (role === "prerequisite")
      assert(
        row?.results.length === 1 && row.results[0] === expected && row.text.length > 0,
        `${id}:${criterion}: invalid disposition`,
      );
    return {
      id: `${id}:${criterion}`,
      owner: id,
      criterion,
      text: normalized(text),
      disposition: row?.results[0] ?? null,
      recordedEvidence: row?.text ?? null,
    };
  });
  return { id, path, sha256: digest, status, role, requirements };
}

export function deriveRequirements(ticketInputs, programSource, expectedTicketIds) {
  const tickets = ticketInputs
    .map(({ path, source }) => ticketRequirements(path, source))
    .sort((a, b) => a.id.localeCompare(b.id));
  assert(new Set(tickets.map(({ id }) => id)).size === tickets.length, "Duplicate ticket identity");
  sameKeys(
    tickets.map(({ id }) => id),
    expectedTicketIds,
    "Ticket roster",
  );
  assert(
    tickets.some(({ id }) => id === "0033") && tickets.some(({ id }) => id === "0053"),
    "Audit or deferred mutation ticket is missing",
  );
  const program = [
    ...section(
      programSource.replace(/\r\n/gu, "\n"),
      "## Program-level acceptance criteria",
    ).matchAll(/^- \[[ x]\] (.*(?:\n[ \t]+[^\n]+)*)/gmu),
  ].map((match, index) => ({
    id: `program:AC-${String(index + 1).padStart(2, "0")}`,
    owner: "0033",
    text: normalized(match[1]),
    disposition: "required",
  }));
  assert(program.length > 0, "Program acceptance inventory is empty");
  const requirements = [
    ...tickets
      .filter(({ role }) => role === "prerequisite")
      .flatMap(({ requirements: rows }) => rows),
    ...program,
  ];
  assert(
    new Set(requirements.map(({ id }) => id)).size === requirements.length,
    "Duplicate requirement identity",
  );
  return { tickets, requirements, programSha256: sha256(programSource) };
}

const strengths = {
  source: new Set(["source"]),
  documentation: new Set(["documentation"]),
  unit: new Set(["unit"]),
  property: new Set(["property"]),
  browser: new Set(["browser"]),
  package: new Set(["package"]),
  static: new Set(["static"]),
  decision: new Set(["decision"]),
  manual: new Set(["manual"]),
};

export function validateMappings(requirements, mappings) {
  const ids = new Set(requirements.map(({ id }) => id));
  assert(ids.size === requirements.length, "Duplicate requirement");
  assert(new Set(mappings.map(({ id }) => id)).size === mappings.length, "Duplicate mapping");
  assert(mappings.length === requirements.length, "Incomplete requirement mapping");
  for (const mapping of mappings) {
    closedObject(mapping, ["id", "review", "requiredKinds", "evidence"], "Mapping");
    assert(ids.has(mapping.id), "Unknown mapping");
    assert(
      typeof mapping.review === "string" && mapping.review.trim().length >= 20,
      `${mapping.id}: missing review rationale`,
    );
    assert(
      Array.isArray(mapping.requiredKinds) &&
        mapping.requiredKinds.length > 0 &&
        new Set(mapping.requiredKinds).size === mapping.requiredKinds.length,
      `${mapping.id}: invalid evidence kinds`,
    );
    assert(
      Array.isArray(mapping.evidence) && mapping.evidence.length > 0,
      `${mapping.id}: missing evidence`,
    );
    assert(
      new Set(mapping.evidence.map((item) => item.id)).size === mapping.evidence.length,
      `${mapping.id}: duplicate citation`,
    );
    for (const kind of mapping.requiredKinds) {
      assert(Object.hasOwn(strengths, kind), `${mapping.id}: unknown evidence kind`);
      assert(
        mapping.evidence.some((item) => strengths[kind].has(item.kind)),
        `${mapping.id}: ${kind} evidence cannot be replaced by a weaker type`,
      );
    }
    for (const item of mapping.evidence) {
      closedObject(item, ["id", "kind", "path", "selector"], "Evidence citation");
      assert(Object.hasOwn(strengths, item.kind), `${mapping.id}: unsupported evidence kind`);
      assert(
        typeof item.id === "string" && /^[a-z0-9][a-z0-9:._-]*$/u.test(item.id),
        `${mapping.id}: invalid citation identity`,
      );
      safeRelativePath(item.path);
      assert(
        typeof item.selector === "string" &&
          item.selector.trim().length > 0 &&
          item.selector.trim() !== "*",
        `${mapping.id}: evidence needs an exact selector`,
      );
    }
  }
  return true;
}

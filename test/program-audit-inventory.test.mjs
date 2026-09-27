// @vitest-environment node
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { it } from "vitest";
import { extractClaimCandidates, discoverClaimPaths } from "../scripts/program-audit/claims.mjs";
import { buildInventory, inventoryMarkdown } from "../scripts/program-audit/inventory.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

it("captures authored Markdown examples and HTML text without executing scripts", () => {
  const markdown = "# Contract\n\nNative controls work.\n\n```js\nrun();\n\nstop();\n```\n";
  const rows = extractClaimCandidates("docs/contract.md", markdown);
  assert.equal(rows.length, 3);
  assert(rows[2].text.includes("run();\n\nstop();"));
  assert(rows.every(({ disposition }) => disposition === "unreviewed"));
  assert.throws(() => extractClaimCandidates("docs/contract.md", "```js\nrun();"));
  const html =
    '<title>Contract</title><meta name="description" content="Native controls">' +
    "<p>Supported <strong>behavior</strong>.</p><ul><li><p>Nested claim.</p></li></ul>" +
    "<div>Standalone text.</div><script>globalThis.programAuditCanary = true;</script>";
  const claims = extractClaimCandidates("example/index.html", html);
  assert.equal(claims.length, 5);
  assert(claims.some(({ text }) => text.includes("description")));
  assert(claims.some(({ text }) => text === "Standalone text."));
  assert.equal(globalThis.programAuditCanary, undefined);
  assert(!claims.some(({ text }) => text.includes("programAuditCanary")));
  assert.deepEqual(
    discoverClaimPaths([
      "docs/tickets/0001-fixture.md",
      "docs/tickets/ROADMAP.md",
      "README.md",
      "etc/core.api.md",
      "example/index.html",
      "src/runtime.ts",
    ]),
    ["README.md", "docs/tickets/ROADMAP.md", "etc/core.api.md", "example/index.html"],
  );
});

it("derives the complete repository review inventory without claiming an audit pass", async () => {
  const ticketNames = (await readdir("docs/tickets")).filter(
    (name) => /^\d{4}-/u.test(name) && !name.startsWith("0033-") && !name.startsWith("0053-"),
  );
  const tickets = await Promise.all(
    ticketNames.map((name) => readFile(`docs/tickets/${name}`, "utf8")),
  );
  if (
    tickets.some((source) =>
      /^status: (planned|coding|testing|documenting|blocked)$/mu.test(source),
    )
  ) {
    // Reopening an owner must stop the audit, while allowing that owner's normal quality checks.
    await assert.rejects(buildInventory(process.cwd()), /nonterminal prerequisite/u);
    return;
  }
  const inventory = await buildInventory(process.cwd());
  assert.equal(inventory.status, "review-required");
  assert.equal(inventory.tickets.length, 53);
  assert.equal(inventory.tickets.filter(({ role }) => role === "prerequisite").length, 51);
  assert.equal(inventory.requirements.length, 613);
  assert(inventory.requirements.some(({ id }) => id === "0034:AC-06"));
  assert.equal(inventory.tickets.find(({ id }) => id === "0053").status, "planned");
  assert(inventory.claimCandidates.length > 100);
  assert(inventory.claimCandidates.every(({ disposition }) => disposition === "unreviewed"));
  const human = inventoryMarkdown(inventory);
  assert(human.includes("not a frozen release manifest"));
  assert(human.includes("613 ticket/program requirements"));
  const validate = createSchemaValidator(
    JSON.parse(await readFile("quality/program-audit/inventory.schema.json", "utf8")),
  );
  for (const field of ["inputs", "requirements", "claimCandidates", "unresolved"]) {
    const narrowed = { ...inventory, [field]: [] };
    assert.equal(validate(narrowed), false);
  }
  assert.equal(validate({ ...inventory, status: "pass" }), false);
  assert.equal(validate({ ...inventory, privateCanary: "secret" }), false);
}, 30000);

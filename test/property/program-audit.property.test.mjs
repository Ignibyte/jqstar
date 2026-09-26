// @vitest-environment node
import assert from "node:assert/strict";
import fc from "fast-check";
import { it } from "vitest";
import { assertProperty } from "./helpers";
import { extractClaimCandidates } from "../../scripts/program-audit/claims.mjs";
import { deterministicJson } from "../../scripts/program-audit/files.mjs";
import { deriveRequirements } from "../../scripts/program-audit/requirements.mjs";

function ticket(id, split) {
  return {
    path: `docs/tickets/${id}-fixture.md`,
    source: `---\nid: ${id}\nstatus: ${["0033", "0053"].includes(id) ? "planned" : "done"}\n---\n\n### Acceptance criteria\n\n- [x] [AC-01]${split ? "\n      " : " "}A generated required behavior.\n\n### Acceptance evidence\n\n| AC-01 | Pass | Synthetic recorded assertion. |\n\n### Completion audit\n\nStatus: Complete\n`,
  };
}

it("preserves the expected criterion roster under ordering and wrapped descriptions", () => {
  assertProperty(
    "program-audit-complete-roster",
    fc.property(
      fc.uniqueArray(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 15 }),
      fc.boolean(),
      (numbers, split) => {
        const ids = [...numbers.map((n) => String(n).padStart(4, "0")), "0033", "0053"];
        const inputs = ids.map((id) => ticket(id, split));
        const program = "## Program-level acceptance criteria\n\n- [ ] Preserve ownership.\n";
        const first = deriveRequirements(inputs, program, ids);
        const reversed = deriveRequirements([...inputs].reverse(), program, ids);
        assert.equal(deterministicJson(first), deterministicJson(reversed));
        assert.equal(first.requirements.length, numbers.length + 1);
        assert.throws(() => deriveRequirements(inputs.slice(1), program, ids));
        assert.throws(() => deriveRequirements([...inputs, inputs[0]], program, ids));
      },
    ),
  );
});

it("keeps duplicate prose occurrences distinct and marks every generated claim unreviewed", () => {
  assertProperty(
    "program-audit-claim-inventory",
    fc.property(
      fc.array(fc.stringMatching(/^[a-z][a-z ]{1,30}$/u), { minLength: 1, maxLength: 20 }),
      (parts) => {
        const source = [...parts, parts[0]].join("\n\n");
        const claims = extractClaimCandidates("docs/generated.md", source);
        assert.equal(claims.length, parts.length + 1);
        assert.equal(new Set(claims.map(({ id }) => id)).size, claims.length);
        assert(claims.every(({ disposition }) => disposition === "unreviewed"));
        assert.equal(
          deterministicJson(claims),
          deterministicJson(extractClaimCandidates("docs/generated.md", source)),
        );
      },
    ),
  );
});

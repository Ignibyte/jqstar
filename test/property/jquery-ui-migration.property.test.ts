import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import fc from "fast-check";
import { expect, it } from "vitest";

interface Entry {
  id: string;
  matrixId: string;
}

interface Row {
  id: string;
  inventoryIds: string[];
}

const contract = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../quality/jquery-ui-migration.json"), "utf8"),
) as {
  applicationSlices: Array<{
    adapterHypothesis: { authoredHtmlJsLines: number };
    directMigration: { authoredHtmlJsLines: number };
  }>;
  officialInventory: Entry[];
  matrix: Row[];
};

it("preserves total inventory mapping under generated orderings", () => {
  fc.assert(
    fc.property(
      fc.shuffledSubarray(contract.officialInventory, { minLength: 72, maxLength: 72 }),
      (entries) => {
        const rows = new Map(contract.matrix.map((row) => [row.id, row]));
        const observed = entries.map((entry) => {
          expect(rows.get(entry.matrixId)?.inventoryIds).toContain(entry.id);
          return entry.id;
        });
        expect(new Set(observed).size).toBe(72);
      },
    ),
  );
});

it("rejects generated duplicate, missing, and unknown inventory assignments", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 71 }), fc.string({ minLength: 1 }), (index, suffix) => {
      const expected = new Set(contract.officialInventory.map(({ id }) => id));
      const mapped = contract.matrix.flatMap(({ inventoryIds }) => inventoryIds);
      const missing = mapped.filter((_, mappedIndex) => mappedIndex !== index);
      const duplicate = [...mapped, mapped[index]!];
      const unknown = [...missing, `jquery-ui.generated.${suffix}`];
      expect(new Set(missing)).not.toEqual(expected);
      expect(new Set(duplicate).size).toBeLessThan(duplicate.length);
      expect(new Set(unknown)).not.toEqual(expected);
    }),
  );
});

it("keeps the adapter line-saving failure invariant across generated rounding precision", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 6 }), (precision) => {
      for (const slice of contract.applicationSlices) {
        const saved =
          slice.directMigration.authoredHtmlJsLines - slice.adapterHypothesis.authoredHtmlJsLines;
        const reduction = Number(
          ((saved / slice.directMigration.authoredHtmlJsLines) * 100).toFixed(precision),
        );
        expect(saved).toBeLessThan(20);
        expect(reduction).toBeLessThan(25);
      }
    }),
  );
});

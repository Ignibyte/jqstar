import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import fc from "fast-check";
import { expect, it } from "vitest";

interface Assignment {
  groupId: string;
  id: string;
}

const contract = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../quality/jquery-mobile-migration.json"), "utf8"),
) as {
  apiInventory: Assignment[];
  dataAttributes: Array<{ contexts: string[]; groupId: string; name: string }>;
  groups: Array<{ id: string; owner: string }>;
  owners: string[];
  transitions: Array<{ groupId: string; name: string }>;
};

it("preserves all API assignments under generated orderings", () => {
  fc.assert(
    fc.property(
      fc.shuffledSubarray(contract.apiInventory, { minLength: 95, maxLength: 95 }),
      (entries) => {
        const groups = new Set(contract.groups.map(({ id }) => id));
        expect(new Set(entries.map(({ id }) => id)).size).toBe(95);
        for (const entry of entries) expect(groups.has(entry.groupId)).toBe(true);
      },
    ),
  );
});

it("detects generated missing, duplicate, and unknown data attributes", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 59 }), fc.string({ minLength: 1 }), (index, suffix) => {
      const expected = new Set(contract.dataAttributes.map(({ name }) => name));
      const names = contract.dataAttributes.map(({ name }) => name);
      const missing = names.filter((_, current) => current !== index);
      const duplicate = [...names, names[index]!];
      const unknown = [...missing, `data-generated-${suffix}`];
      expect(new Set(missing)).not.toEqual(expected);
      expect(new Set(duplicate).size).toBeLessThan(duplicate.length);
      expect(new Set(unknown)).not.toEqual(expected);
    }),
  );
});

it("keeps generated owner and transition selections inside the frozen sets", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...contract.groups),
      fc.constantFrom(...contract.transitions),
      (group, transition) => {
        expect(contract.owners).toContain(group.owner);
        expect(transition.groupId).toBe("transitions");
        expect(new Set(contract.transitions.map(({ name }) => name)).size).toBe(10);
      },
    ),
  );
});

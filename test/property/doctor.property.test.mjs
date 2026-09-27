// @vitest-environment node
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { expect, it } from "vitest";
import { runMigration } from "../../bin/doctor/migrations.mjs";
import { canonical, sha256 } from "../../bin/doctor/data.mjs";
import { configPlan } from "../../bin/doctor/configuration.mjs";
import { assertAsyncProperty, assertProperty } from "./helpers";

const rules = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8"));
const componentPath = fc
  .stringMatching(/^[a-z][a-z0-9]{1,20}$/u)
  .map((name) => `components/${name}`);

it("preserves every generated accepted configuration through apply and rollback", async () => {
  await assertAsyncProperty(
    "doctor-configuration-round-trip",
    fc.asyncProperty(
      componentPath,
      componentPath,
      fc.boolean(),
      async (output, blocksOutput, explicitVersion) => {
        const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-doctor-property-")));
        try {
          const data = {
            output,
            blocksOutput,
            registry: "private-property-canary",
            ...(explicitVersion ? { configVersion: 0 } : {}),
          };
          const original = `${JSON.stringify(data)}\n`;
          await writeFile(join(root, "jquery-star.json"), original, { mode: 0o600 });
          const plan = await runMigration({ cwd: root, upgradeConfig: true }, rules);
          expect(JSON.stringify(plan)).not.toContain("private-property-canary");
          await writeFile(join(root, "plan.json"), JSON.stringify(plan));
          await runMigration({ cwd: root, apply: "plan.json" }, rules);
          expect(JSON.parse(await readFile(join(root, "jquery-star.json"), "utf8"))).toEqual({
            ...data,
            configVersion: 1,
          });
          await runMigration({ cwd: root, rollback: plan.journal }, rules);
          expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      },
    ),
  );
}, 30000);

it("binds byte identity separately from semantic identity across key order and whitespace", () => {
  assertProperty(
    "doctor-canonical-and-byte-identity",
    fc.property(componentPath, componentPath, (output, blocksOutput) => {
      const first = { output, blocksOutput };
      const second = { blocksOutput, output };
      const make = (data, space) => {
        const source = JSON.stringify(data, null, space);
        return configPlan(
          { path: "/fixture", device: 1, inode: 2 },
          {
            source,
            data,
            mode: 0o600,
            identity: { device: 1, inode: 3 },
            sha256: sha256(source),
            canonicalSha256: sha256(canonical(data)),
          },
        );
      };
      const a = make(first, 0);
      const b = make(second, 2);
      expect(a.before.sha256).not.toBe(b.before.sha256);
      expect(a.before.canonicalSha256).toBe(b.before.canonicalSha256);
      expect(a.after.canonicalSha256).toBe(b.after.canonicalSha256);
    }),
  );
});

// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { validateDoctorAuthority } from "../scripts/quality/doctor-contract.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const rules = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8"));
const validate = createSchemaValidator(
  JSON.parse(await readFile("schema/doctor-rules.schema.json", "utf8")),
);

it("binds the shipped offline rules to support policy, exports, ecosystem evidence, and documentation", async () => {
  expect(validate(rules), JSON.stringify(validate.errors)).toBe(true);
  await validateDoctorAuthority(rules);
});

it.each(["digest", "range", "entrypoint", "duplicate-code", "documentation"])(
  "rejects stale %s rules",
  async (change) => {
    const changed = structuredClone(rules);
    if (change === "digest") changed.authority[0].sha256 = "0".repeat(64);
    if (change === "range") changed.compatibility.jquery = ">=3";
    if (change === "entrypoint") changed.compatibility.entrypoints.pop();
    if (change === "duplicate-code") changed.diagnostics.push(changed.diagnostics[0]);
    if (change === "documentation")
      changed.diagnostics[0].documentation = "https://example.invalid";
    await expect(validateDoctorAuthority(changed)).rejects.toThrow();
  },
);

it("rejects expanded scan limits and unknown manifest fields", () => {
  const changed = structuredClone(rules);
  changed.limits.packages++;
  expect(validate(changed)).toBe(false);
  expect(validate({ ...rules, telemetry: true })).toBe(false);
});

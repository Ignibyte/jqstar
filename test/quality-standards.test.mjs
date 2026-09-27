// @vitest-environment node
import { readFile } from "node:fs/promises";
import { matchesGlob } from "node:path";
import { ESLint } from "eslint";
import { FileSystemConfigLoader, HtmlValidate } from "html-validate";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { configuredStaticGates } from "../scripts/quality/run-static.mjs";
import { qualityPaths } from "../scripts/quality/static-lib.mjs";
import {
  countedRules,
  compareBoundaryCounts,
  validateBoundaryInventory,
} from "../scripts/quality/check-lint-boundaries.mjs";

const metrics = JSON.parse(await readFile("quality/metrics.json", "utf8"));
const lint = new ESLint();
const enabled = (rule) => (Array.isArray(rule) ? rule[0] === 2 : rule === 2);

describe("effective quality controls", () => {
  it("selects every authored HTML file in canonical and standalone validation", async () => {
    const paths = (await qualityPaths()).filter((path) => path.endsWith(".html"));
    expect(paths).toContain("e2e/fixtures/csp-proof/index.html");
    const gate = configuredStaticGates().find(({ id }) => id === "html");
    expect(gate.enforced).toBe(true);
    expect(gate.modes).toEqual(["fast", "delivery", "full-audit"]);
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    const standalone = manifest.scripts["lint:html"].split(" ").slice(1);
    for (const patterns of [gate.args.slice(2), standalone])
      for (const path of paths)
        expect(
          patterns.some((pattern) => matchesGlob(path, pattern)),
          path,
        ).toBe(true);
  });

  it("rejects malformed CSP fixture HTML and accepts its correction with the actual configuration", async () => {
    const path = "e2e/fixtures/csp-proof/index.html";
    const validator = new HtmlValidate(new FileSystemConfigLoader());
    const prefix =
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Probe</title></head><body>';
    const bad = await validator.validateString(
      `${prefix}<input type="text"></input></body></html>`,
      path,
    );
    expect(bad.valid).toBe(false);
    expect(
      bad.results
        .flatMap(({ messages }) => messages)
        .some(({ ruleId }) => ruleId === "void-content"),
    ).toBe(true);
    const good = await validator.validateString(`${prefix}<input type="text"></body></html>`, path);
    expect(good.valid).toBe(true);
    expect((await validator.validateString(await readFile(path, "utf8"), path)).valid).toBe(true);
  });

  it("enforces counted typed rules by default and rejects growing or stale allowances", async () => {
    const config = await lint.calculateConfigForFile("src/quality-contract-new-file.ts");
    for (const rule of countedRules) expect(enabled(config.rules[rule]), rule).toBe(true);
    const item = { path: "src/fixture.ts", rule: countedRules[0], count: 1 };
    const inventory = {
      schema: "jqstar-lint-boundaries/1",
      reviewAfter: "2027-03-03",
      rules: countedRules.map((rule) => ({ rule })),
      allowances: [item],
    };
    const actual = new Map([[`${item.path}:${item.rule}`, 1]]);
    expect(validateBoundaryInventory(inventory, [item.path], "2026-09-06")).toEqual([]);
    expect(compareBoundaryCounts(inventory, actual, inventory)).toEqual([]);
    expect(compareBoundaryCounts(inventory, new Map(), inventory)).not.toEqual([]);
    const raised = { ...inventory, allowances: [{ ...item, count: 2 }] };
    expect(
      compareBoundaryCounts(raised, new Map([[`${item.path}:${item.rule}`, 2]]), inventory),
    ).not.toEqual([]);
    expect(compareBoundaryCounts(inventory, actual, { ...inventory, allowances: [] })).not.toEqual(
      [],
    );
    expect(validateBoundaryInventory(inventory, [], "2026-09-06")).not.toEqual([]);
    expect(validateBoundaryInventory(inventory, [item.path], "2028-01-01")).not.toEqual([]);
  });
  it.each([
    "src/reactivity.ts",
    "server/api.ts",
    "registry/blocks/audit-log.ts",
    "test/runtime.test.ts",
    "example/site.ts",
    "bin/doctor/index.mjs",
    "scripts/quality/run.mjs",
    "eslint.config.js",
    ".dependency-cruiser.cjs",
  ])("enforces maintainability rules on %s", async (path) => {
    const config = await lint.calculateConfigForFile(path);
    expect(config.rules["sonarjs/cognitive-complexity"]).toEqual([
      2,
      metrics.sonarjs.cognitiveComplexityMaximum,
    ]);
    for (const rule of [
      "no-duplicated-branches",
      "no-identical-conditions",
      "no-inverted-boolean-check",
      "no-nested-switch",
    ])
      expect(enabled(config.rules[`sonarjs/${rule}`])).toBe(true);
    if (path.endsWith(".ts"))
      for (const rule of [
        "no-floating-promises",
        "no-misused-promises",
        "no-unnecessary-type-assertion",
        "no-unnecessary-type-arguments",
      ])
        expect(enabled(config.rules[`@typescript-eslint/${rule}`])).toBe(true);
  });

  it("rejects a duplicated JavaScript condition and accepts its correction", async () => {
    const filePath = "bin/quality-contract-probe.mjs";
    const bad = await lint.lintText(
      "export function choose(value) { if (value === 1) return 1; else if (value === 1) return 2; return 3; }",
      { filePath },
    );
    expect(bad[0].messages.some(({ ruleId }) => ruleId === "sonarjs/no-identical-conditions")).toBe(
      true,
    );
    const good = await lint.lintText(
      "export function choose(value) { return value === 1 ? 1 : 2; }",
      { filePath },
    );
    expect(good[0].errorCount).toBe(0);
  });

  it.each([
    "example/site.css",
    "test/fixtures/navigation-decision/style.css",
    "e2e/fixtures/jquery-ui-migration/style.css",
  ])("rejects invalid CSS despite cosmetic fixture boundaries in %s", async (codeFilename) => {
    const bad = await stylelint.lint({ code: ".fixture { color: #ggg; }", codeFilename });
    expect(
      bad.results[0].warnings.some(({ rule }) => rule === "declaration-property-value-no-unknown"),
    ).toBe(true);
    const good = await stylelint.lint({ code: ".fixture { color: #fff; }", codeFilename });
    expect(good.errored).toBe(false);
  });

  it("runs the root JavaScript configuration and authored CSS selectors in every static mode", () => {
    const gates = configuredStaticGates();
    expect(gates.find(({ id }) => id === "lint-boundaries")).toMatchObject({
      args: ["scripts/quality/check-lint-boundaries.mjs"],
      modes: ["fast", "delivery", "full-audit"],
      enforced: true,
    });
    const eslint = gates.find(({ id }) => id === "eslint");
    expect(eslint.args).toEqual(
      expect.arrayContaining([
        "*.config.js",
        ".dependency-cruiser.cjs",
        "bin",
        "scripts",
        "test",
        "e2e",
        "example",
      ]),
    );
    const css = gates.find(({ id }) => id === "stylelint");
    expect(css.args).toEqual(
      expect.arrayContaining(["src/**/*.css", "example/**/*.css", "test/**/*.css", "e2e/**/*.css"]),
    );
    for (const gate of [eslint, css])
      expect(gate.modes).toEqual(["fast", "delivery", "full-audit"]);
  });
});

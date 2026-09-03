import { spawnSync } from "node:child_process";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const local = process.argv.slice(2).includes("--local");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--local");
if (unknownArguments.length > 0) {
  throw new Error(`Unknown build-types arguments: ${unknownArguments.join(", ")}.`);
}

const jqueryAugmentationImports = `
import type {
  ComputedRecord,
  StarDefinition,
  StarInstance,
  StarStatic,
  StateRecord,
} from "./types";
`;

const jqueryGlobalBridge = `
declare global {
  interface JQuery extends JQueryStarJQuery {}
  interface JQueryStatic extends JQueryStarJQueryStatic {}
}
`;

function exportedGlobalInterface(source, interfaceName, exportedName) {
  const sourceFile = ts.createSourceFile(
    "types.d.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const matches = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isModuleDeclaration(statement) &&
      statement.name.text === "global" &&
      statement.body &&
      ts.isModuleBlock(statement.body)
    ) {
      matches.push(
        ...statement.body.statements.filter(
          (candidate) =>
            ts.isInterfaceDeclaration(candidate) && candidate.name.text === interfaceName,
        ),
      );
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Expected one global ${interfaceName} declaration in emitted types; found ${matches.length}.`,
    );
  }
  const declaration = matches[0];
  const exported = ts.factory.updateInterfaceDeclaration(
    declaration,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(exportedName),
    declaration.typeParameters,
    declaration.heritageClauses,
    declaration.members,
  );
  return ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printNode(ts.EmitHint.Unspecified, exported, sourceFile);
}

function run(name, args) {
  const result = spawnSync(npx, ["--no-install", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) {
    throw new Error(`${name} failed with exit ${String(result.status)}.`);
  }
}

run("TypeScript declaration build", ["tsc", "-p", "tsconfig.build.json"]);
const emittedTypes = await readFile("dist/types/types.d.ts", "utf8");
const jqueryAugmentationContract = `${jqueryAugmentationImports}
${exportedGlobalInterface(emittedTypes, "JQuery", "JQueryStarJQuery")}

${exportedGlobalInterface(emittedTypes, "JQueryStatic", "JQueryStarJQueryStatic")}
`;
await appendFile("dist/types/index.d.ts", jqueryAugmentationContract, "utf8");
const entrypoints = [
  { name: "root", config: "config/api-extractor.json", declaration: "dist/index.d.ts" },
  { name: "core", config: "config/api-extractor.core.json", declaration: "dist/core.d.ts" },
  { name: "csp", config: "config/api-extractor.csp.json", declaration: "dist/csp.d.ts" },
  { name: "ui", config: "config/api-extractor.ui.json", declaration: "dist/ui.d.ts" },
  {
    name: "datastar",
    config: "config/api-extractor.datastar.json",
    declaration: "dist/datastar.d.ts",
  },
  {
    name: "testing",
    config: "config/api-extractor.testing.json",
    declaration: "dist/testing.d.ts",
  },
  { name: "turbo", config: "config/api-extractor.turbo.json", declaration: "dist/turbo.d.ts" },
  {
    name: "datastar-testing",
    config: "config/api-extractor.datastar-testing.json",
    declaration: "dist/datastar-testing.d.ts",
  },
];
for (const entrypoint of entrypoints) {
  run(`API Extractor (${entrypoint.name})`, [
    "api-extractor",
    "run",
    "--config",
    entrypoint.config,
    ...(local ? ["--local"] : []),
  ]);
}

await appendFile("dist/index.d.ts", jqueryGlobalBridge, "utf8");
const declaration = await readFile("dist/index.d.ts", "utf8");
const apiReport = await readFile("etc/jquery-star.api.md", "utf8");
for (const marker of ["interface JQueryStarJQuery", "interface JQueryStarJQueryStatic"]) {
  if (!declaration.includes(marker)) throw new Error(`Declaration rollup omits ${marker}.`);
  if (!apiReport.includes(marker)) throw new Error(`API report omits ${marker}.`);
}
for (const marker of [
  "interface JQuery extends JQueryStarJQuery {}",
  "interface JQueryStatic extends JQueryStarJQueryStatic {}",
]) {
  if (!declaration.includes(marker)) throw new Error(`Declaration rollup omits ${marker}.`);
}
for (const entrypoint of entrypoints) {
  const moduleName = entrypoint.declaration.replace(/^dist\//, "").replace(/\.d\.ts$/, "");
  await writeFile(
    entrypoint.declaration.replace(/\.d\.ts$/, ".d.cts"),
    `export * from "./${moduleName}.js";\n`,
    "utf8",
  );
}

const coreDeclaration = await readFile("dist/core.d.ts", "utf8");
for (const marker of ["declare global", "JQueryStarJQueryStatic", "StarUIStatic"]) {
  if (coreDeclaration.includes(marker)) {
    throw new Error(`Core declaration unexpectedly contains ${marker}.`);
  }
}

const testingDeclaration = await readFile("dist/testing.d.ts", "utf8");
for (const marker of ["vitest", "jest", "qunit", "playwright", "jsdom"]) {
  if (testingDeclaration.toLowerCase().includes(marker)) {
    throw new Error(`Testing declaration unexpectedly contains ${marker}.`);
  }
}

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateDoctorAuthority } from "./doctor-contract.mjs";
import { qualityPaths, readJSON, repositoryRoot } from "./static-lib.mjs";

export function createSchemaValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

async function validateInstance(instancePath, schemaPath, definition) {
  const schema = await readJSON(schemaPath);
  const validate = createSchemaValidator(
    definition
      ? { $schema: schema.$schema, $defs: schema.$defs, $ref: `#/$defs/${definition}` }
      : schema,
  );
  const valid = validate(await readJSON(instancePath));
  if (!valid) {
    throw new Error(
      `${instancePath} failed ${schemaPath}:\n${JSON.stringify(validate.errors, null, 2)}`,
    );
  }
}

async function main() {
  const jsonFiles = (await qualityPaths()).filter((path) => path.endsWith(".json"));
  if (jsonFiles.length === 0) throw new Error("JSON validation selected no files.");
  for (const path of jsonFiles) JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"));
  await validateInstance("quality/scopes.json", "quality/scopes.schema.json");
  await validateInstance("quality/deviations.json", "quality/deviations.schema.json");
  await validateInstance("config/quality-budgets.json", "schema/quality-budgets.schema.json");
  await validateInstance("quality/public-baseline.json", "schema/public-baseline.schema.json");
  await validateInstance("quality/jquery-ecosystem.json", "schema/jquery-ecosystem.schema.json");
  await validateInstance(
    "quality/jquery-ui-migration.json",
    "schema/jquery-ui-migration.schema.json",
  );
  await validateInstance(
    "quality/jquery-mobile-migration.json",
    "schema/jquery-mobile-migration.schema.json",
  );
  await validateInstance("quality/release-contract.json", "schema/release-contract.schema.json");
  await validateInstance("bin/doctor/compatibility.json", "schema/doctor-rules.schema.json");
  await validateDoctorAuthority(await readJSON("bin/doctor/compatibility.json"));
  await validateInstance("quality/resource-strategy.json", "schema/resource-strategy.schema.json");
  await validateInstance(
    "quality/navigation-decision.json",
    "schema/navigation-decision.schema.json",
  );
  const navigation = await readJSON("quality/navigation-decision.json");
  const navigationSchema = await readJSON("schema/navigation-decision.schema.json");
  const { readNavigationMeasurement } = await import("./navigation-evidence.mjs");
  for (const reference of navigation.measurements)
    await readNavigationMeasurement(reference, navigationSchema);
  const archives = (await readdir("quality/evidence/navigation"))
    .map((name) => `quality/evidence/navigation/${name}`)
    .sort();
  const referencedArchives = navigation.measurements.map((reference) => reference.raw.path).sort();
  if (JSON.stringify(archives) !== JSON.stringify(referencedArchives))
    throw new Error("Navigation archive directory must match the validated references exactly.");
  await validateInstance(
    "quality/evidence/navigation-costs.json",
    "schema/navigation-decision.schema.json",
    "costMeasurement",
  );
  const cspManifests = [
    "test/fixtures/csp/contract.json",
    "test/fixtures/csp/accepted.json",
    "test/fixtures/csp/denied.json",
    "test/fixtures/csp/adversarial.json",
    "test/fixtures/csp/contexts.json",
    "test/fixtures/csp/conformance-map.json",
  ];
  for (const manifest of cspManifests) {
    await validateInstance(manifest, "schema/csp-expression-contract.schema.json");
  }
  const schemas = jsonFiles.filter((path) => path.endsWith(".schema.json"));
  for (const schema of schemas) createSchemaValidator(await readJSON(schema));
  process.stdout.write(
    `JSON and schemas: ${jsonFiles.length} files parsed, ${12 + cspManifests.length} instances and ${schemas.length} schemas validated\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

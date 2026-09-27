import {
  externalizeSourceMaps,
  verifyExternalizedSourceMaps,
} from "./quality/source-map-packaging.mjs";

await externalizeSourceMaps(process.cwd());
const manifest = await verifyExternalizedSourceMaps(process.cwd());
console.log(`Externalized ${manifest.sources.length} repeated source-map inputs.`);

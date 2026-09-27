import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import {
  navigationInputIdentity,
  prepareNavigationDecision,
} from "./prepare-navigation-decision.mjs";
import { createSchemaValidator } from "./quality/validate-json.mjs";
import { archiveNavigationMeasurement } from "./quality/navigation-evidence.mjs";
import { createNavigationDecisionServer } from "../test/fixtures/navigation-decision/server.mjs";
import { runNavigationScenarios } from "../test/fixtures/navigation-decision/driver.mjs";

const evidencePath = resolve("quality/navigation-decision.json");
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
const validate = createSchemaValidator(schema);
const hash = (value) => createHash("sha256").update(value).digest("hex");
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
if (hash(canonical(evidence.contract)) !== evidence.contractSha256)
  throw new Error("The frozen navigation contract changed without an explicit revision.");
const input = await navigationInputIdentity();
const amendmentIndex = process.argv.indexOf("--amend");
const amendment = amendmentIndex >= 0 ? process.argv[amendmentIndex + 1] : null;
if (evidence.fixtureIdentity && evidence.fixtureIdentity.sha256 !== input.sha256) {
  if (!amendment || amendment.length < 20)
    throw new Error(
      "Changed navigation inputs require --amend with a concrete reason and a complete rerun.",
    );
  evidence.amendments.push({
    createdAt: new Date().toISOString(),
    previousSha256: evidence.fixtureIdentity.sha256,
    nextSha256: input.sha256,
    reason: amendment,
  });
}
evidence.fixtureIdentity = input;
evidence.status = "measuring";
if (!validate(evidence)) throw new Error(JSON.stringify(validate.errors));
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Frozen navigation inputs ${input.sha256} before package or browser measurements.`);
if (process.argv.includes("--freeze-only")) process.exit(0);
const prepared = await prepareNavigationDecision();
if (prepared.input.sha256 !== input.sha256)
  throw new Error("Prepared artifact input differs from the frozen fixture.");
const createdAt = new Date().toISOString();
const runId = `${createdAt.replaceAll(":", "-")}-${process.pid}`;
const output = resolve(".git/jqstar/navigation-decision/measurements", runId);
await mkdir(output, { recursive: true });
const raw = {
  schema: "jqstar-navigation-measurement/1",
  runId,
  createdAt,
  contractSha256: evidence.contractSha256,
  fixtureSha256: input.sha256,
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    playwright: JSON.parse(await readFile("node_modules/@playwright/test/package.json", "utf8"))
      .version,
  },
  artifact: {
    filename: prepared.tarball.filename,
    sha256: prepared.tarball.sha256,
    integrity: prepared.tarball.integrity,
    packedBytes: prepared.tarball.packedBytes,
    unpackedBytes: prepared.tarball.unpackedBytes,
  },
  packages: prepared.packages,
  bundles: prepared.bundles,
  candidates: [],
  status: "partial",
};
const server = createNavigationDecisionServer(prepared.assets);
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
let stopped = false;
try {
  for (const candidate of evidence.contract.candidates) {
    let candidateFailed = false;
    const configurations =
      candidate.host === "browser" ? ["configured"] : ["default", "configured"];
    for (const configuration of configurations) {
      for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
        const browser = await browserType.launch();
        try {
          const row = {
            candidate: candidate.id,
            configuration,
            browser: engine,
            browserVersion: browser.version(),
            flows: [],
          };
          raw.candidates.push(row);
          const result = await runNavigationScenarios(browser, origin, candidate, {
            configuration,
            onFlow(flow) {
              row.flows.push(flow);
              console.log(
                `${engine} ${candidate.id} ${configuration} ${flow.id} ${flow.status}${flow.failure ? ` (${flow.failure})` : ""}`,
              );
            },
          });
          row.flows = result.flows;
          candidateFailed ||= row.flows.some((flow) => flow.status === "fail");
          await writeFile(resolve(output, "progress.json"), `${JSON.stringify(raw, null, 2)}\n`);
        } finally {
          await browser.close();
        }
      }
    }
    if (candidate.host === "browser" && candidateFailed) {
      stopped = true;
      console.log("Ordinary-browser baseline failed; enhanced comparisons remain unmeasured.");
      break;
    }
  }
  raw.status =
    stopped ||
    raw.candidates.some(
      (row) =>
        row.configuration === "configured" && row.flows.some((flow) => flow.status === "fail"),
    )
      ? "fail"
      : "pass";
} catch {
  raw.status = "fail";
  console.log(
    "Measurement stopped on an infrastructure or fixture error; partial evidence is retained.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
}
if ((await navigationInputIdentity()).sha256 !== input.sha256)
  throw new Error("Navigation inputs changed during measurement.");
const rawPath = resolve(output, "raw.json");
await writeFile(rawPath, `${JSON.stringify(raw, null, 2)}\n`, { flag: "wx" });
const reference = await archiveNavigationMeasurement(raw, schema);
const candidateEvidence = { ...evidence, measurements: [...evidence.measurements, reference] };
if (!validate(candidateEvidence))
  throw new Error(
    `Raw navigation result failed its closed schema: ${JSON.stringify(validate.errors)}`,
  );
if (process.argv.includes("--record"))
  await writeFile(evidencePath, `${JSON.stringify(candidateEvidence, null, 2)}\n`);
console.log(`Navigation ${raw.status}; immutable raw evidence: ${rawPath}`);
if (raw.status !== "pass") process.exitCode = 1;

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { chromium, firefox, webkit } from "@playwright/test";
import { createNavigationDecisionServer } from "../test/fixtures/navigation-decision/server.mjs";
import { runNavigationScenarios } from "../test/fixtures/navigation-decision/driver.mjs";
import { archiveNavigationMeasurement } from "./quality/navigation-evidence.mjs";
import { prepareNavigationDecision } from "./prepare-navigation-decision.mjs";

const probe = process.argv[2];
if (!["private-link-entry", "chromium-cache-sensitivity"].includes(probe))
  throw new Error("Choose private-link-entry or chromium-cache-sensitivity.");
const evidence = JSON.parse(await readFile("quality/navigation-decision.json", "utf8"));
const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
const built = await prepareNavigationDecision();
if (built.input.sha256 !== evidence.fixtureIdentity?.sha256)
  throw new Error("Supplemental probe requires the currently frozen fixture.");
const createdAt = new Date().toISOString();
const raw = {
  schema: "jqstar-navigation-measurement/1",
  runId: `${probe}-${createdAt.replaceAll(":", "-")}-${process.pid}`,
  createdAt,
  contractSha256: evidence.contractSha256,
  fixtureSha256: built.input.sha256,
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    playwright: JSON.parse(await readFile("node_modules/@playwright/test/package.json", "utf8"))
      .version,
    probe,
    probeSourceSha256: createHash("sha256")
      .update(await readFile(new URL(import.meta.url)))
      .digest("hex"),
  },
  artifact: {
    filename: built.tarball.filename,
    sha256: built.tarball.sha256,
    integrity: built.tarball.integrity,
    packedBytes: built.tarball.packedBytes,
    unpackedBytes: built.tarball.unpackedBytes,
  },
  packages: built.packages,
  bundles: built.bundles,
  candidates: [],
  status: "partial",
};
const server = createNavigationDecisionServer(built.assets);
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
let failed = false;
try {
  for (const [engine, browserType] of Object.entries(
    probe === "private-link-entry" ? { chromium, firefox, webkit } : { chromium },
  )) {
    const browser = await browserType.launch(
      probe === "chromium-cache-sensitivity"
        ? { ignoreDefaultArgs: ["--disable-back-forward-cache"] }
        : {},
    );
    try {
      for (const candidate of evidence.contract.candidates) {
        const browserFacade = {
          version: () => browser.version(),
          async newContext(options) {
            const context = await browser.newContext(options);
            if (probe === "private-link-entry") {
              context.on("page", (page) => {
                const goto = page.goto.bind(page);
                page.goto = async (url, gotoOptions) => {
                  if (new URL(url).pathname !== "/navigation/private")
                    return goto(url, gotoOptions);
                  const response = page.waitForResponse(
                    (value) => new URL(value.url()).pathname === "/navigation/private",
                  );
                  await page.locator("#private").click();
                  return response;
                };
              });
            }
            return context;
          },
        };
        const result = await runNavigationScenarios(browserFacade, origin, candidate, {
          configuration: "configured",
          subset:
            probe === "private-link-entry" ? ["NAV-26"] : ["NAV-05", "NAV-23", "NAV-24", "NAV-26"],
          onFlow(flow) {
            console.log(`${engine} ${candidate.id} ${probe} ${flow.id} ${flow.status}`);
          },
        });
        failed ||= result.flows.some((flow) => flow.status === "fail");
        raw.candidates.push({
          candidate: candidate.id,
          configuration: "configured",
          browser: engine,
          browserVersion: browser.version(),
          flows: result.flows,
        });
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
}
const reference = await archiveNavigationMeasurement(raw, schema);
const path = `.git/jqstar/${raw.runId}-reference.json`;
await writeFile(path, `${JSON.stringify(reference, null, 2)}\n`, { flag: "wx" });
console.log(`Supplemental ${failed ? "fail" : "pass"}; partial-scope archive reference: ${path}`);
if (failed) process.exitCode = 1;

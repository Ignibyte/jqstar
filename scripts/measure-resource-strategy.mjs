import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import { createResourceStrategyServer } from "../test/fixtures/resource-strategy/server.mjs";
import { instrumentInspectorTimers } from "../test/fixtures/resource-strategy/instrumentation.mjs";

const root = process.cwd();
const fixture = resolve("test/fixtures/resource-strategy");
const record = process.argv.includes("--record");
const evidencePath = resolve("quality/resource-strategy.json");
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const document = await readFile(evidence.contract.document, "utf8");
const frozen = document.slice(
  document.indexOf("## Frozen comparison contract"),
  document.indexOf("## Results and decision"),
);
const hash = (input) => createHash("sha256").update(input).digest("hex");
if (hash(frozen) !== evidence.contract.sha256)
  throw new Error(
    "The frozen comparison contract changed. Record and review an amendment before measuring.",
  );
execFileSync(process.execPath, ["scripts/prepare-resource-strategy.mjs"], { stdio: "inherit" });
const assets = resolve(
  process.env.JQS_RESOURCE_BUILD_DIRECTORY ?? ".git/jqstar/resource-strategy/build",
);
const graphs = JSON.parse(await readFile(resolve(assets, "graphs.json"), "utf8"));
const now = new Date().toISOString();
const output = resolve(".git/jqstar/resource-strategy/measurements", now.replaceAll(":", "-"));
await mkdir(output, { recursive: true });

async function inventory(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await inventory(path)));
    else {
      const bytes = await readFile(path);
      const lines = bytes.toString("utf8").split("\n");
      result.push({
        path: path.slice(root.length + 1),
        bytes: bytes.length,
        sha256: hash(bytes),
        lines: lines.length - 1,
        nonblankNoncommentLines: lines.filter(
          (line) => line.trim() && !/^\s*(\/\/|\/\*|\*|\*\/)/.test(line),
        ).length,
      });
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
const sourceInventory = await inventory(fixture);
const sourceDigest = hash(JSON.stringify(sourceInventory));
const supportInventory = [];
for (const [category, paths] of Object.entries({
  tests: [
    "test/resource-strategy.test.ts",
    "test/resource-strategy-server.test.mjs",
    "test/resource-strategy-contract.test.mjs",
    "e2e/resource-strategy.spec.ts",
  ],
  tooling: [
    "scripts/prepare-resource-strategy.mjs",
    "scripts/measure-resource-strategy.mjs",
    "scripts/score-resource-strategy.mjs",
    "scripts/quality/resource-strategy-score.mjs",
    "scripts/record-resource-strategy-browser.mjs",
    "e2e/fixtures/resource-strategy-server.mjs",
  ],
  documentation: [
    "docs/decisions/RESOURCE_STRATEGY.md",
    "docs/tickets/0020-prove-resource-strategy.md",
    "README.md",
    "docs/ARCHITECTURE.md",
    "docs/PROJECT.md",
    "docs/RUNTIME_OWNERSHIP.md",
    "docs/TESTING.md",
    "docs/DEVELOPMENT.md",
    "example/docs/datastar/index.html",
  ],
})) {
  for (const path of paths) {
    const bytes = await readFile(path);
    supportInventory.push({
      category,
      path,
      bytes: bytes.length,
      lines: bytes.toString("utf8").split("\n").length - 1,
      sha256: hash(bytes),
    });
  }
}
const raw = {
  schema: "resource-strategy-measurement/1",
  createdAt: now,
  contractDigest: evidence.contract.sha256,
  sourceDigest,
  environment: {
    node: process.version,
    os: platform(),
    release: release(),
    arch: arch(),
    vite: JSON.parse(await readFile("node_modules/vite/package.json", "utf8")).version,
    playwright: JSON.parse(await readFile("node_modules/@playwright/test/package.json", "utf8"))
      .version,
  },
  sourceInventory,
  supportInventory,
  graphs,
  samples: [],
  summaries: [],
};

async function select(page, id) {
  return await page.evaluate(
    (selected) =>
      new Promise((resolveSelection, reject) => {
        const started = performance.now();
        const observer = new MutationObserver(check);
        const timeout = setTimeout(() => {
          observer.disconnect();
          reject(new Error("Selection did not settle."));
        }, 5_000);
        function check() {
          const panels = ["summary", "activity"].map((name) => document.getElementById(name));
          if (
            !panels.every(
              (panel) =>
                panel.getAttribute("aria-busy") === "false" &&
                panel.querySelector("[data-part=content]").dataset.project === selected,
            )
          )
            return;
          observer.disconnect();
          clearTimeout(timeout);
          resolveSelection(performance.now() - started);
        }
        observer.observe(document.getElementById("inspector"), {
          subtree: true,
          attributes: true,
          childList: true,
        });
        const link = document.getElementById(`select-${selected}`);
        link.focus();
        link.click();
        check();
      }),
    id,
  );
}
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
const server = createResourceStrategyServer(assets);
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await browserType.launch();
    try {
      for (const strategy of ["server", "external", "native"]) {
        for (let iteration = 0; iteration < evidence.contract.repetitions; iteration += 1) {
          const context = await browser.newContext();
          try {
            await context.addInitScript(instrumentInspectorTimers);
            const page = await context.newPage();
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            const base = `${origin}/resource-strategy/${engine}-${strategy}-${iteration}`;
            await page.goto(`${base}/${strategy}`);
            await page.waitForFunction(() => Boolean(window.inspectorFixture));
            const counters = async () => await (await page.request.get(`${base}/metrics`)).json();
            const boot = await counters();
            const coldMs = await select(page, "B");
            const cold = await counters();
            const awayMs = await select(page, "A");
            const away = await counters();
            const warmMs = await select(page, "B");
            const warm = await counters();
            const client = await page.evaluate(() => window.inspectorFixture.inspect());
            const disposal = await page.evaluate(() => window.inspectorFixture.dispose());
            await page.waitForFunction(
              () =>
                window.inspectorTimers.size === 0 &&
                window.inspectorFixture.inspect().pending === 0 &&
                window.inspectorFixture.inspect().tasks === 0,
            );
            const terminal = await page.evaluate(() => ({
              ...window.inspectorFixture.inspect(),
              browserTimers: window.inspectorTimers.size,
            }));
            if (
              errors.length ||
              disposal.failed.length ||
              disposal.remaining.length ||
              terminal.records ||
              terminal.observers ||
              terminal.browserTimers
            )
              throw new Error(
                `Measurement lifecycle failed for ${engine}/${strategy}: ${JSON.stringify(errors)}`,
              );
            if (boot.reads !== 0 || cold.reads !== 1)
              throw new Error(`Cold coordination contract failed for ${engine}/${strategy}`);
            raw.samples.push({
              engine,
              browserVersion: browser.version(),
              strategy,
              iteration,
              coldMs,
              awayMs,
              warmMs,
              coldOriginReads: cold.reads - boot.reads,
              awayOriginReads: away.reads - cold.reads,
              warmOriginReads: warm.reads - away.reads,
              counters: warm,
              client,
              terminal,
              disposal,
            });
          } finally {
            await context.close();
          }
        }
        const samples = raw.samples.filter(
          (sample) => sample.engine === engine && sample.strategy === strategy,
        );
        const summary = {
          engine,
          strategy,
          repetitions: samples.length,
          coldMedianMs: percentile(
            samples.map((sample) => sample.coldMs),
            0.5,
          ),
          coldP95Ms: percentile(
            samples.map((sample) => sample.coldMs),
            0.95,
          ),
          warmMedianMs: percentile(
            samples.map((sample) => sample.warmMs),
            0.5,
          ),
          warmP95Ms: percentile(
            samples.map((sample) => sample.warmMs),
            0.95,
          ),
          warmOriginReads: samples.map((sample) => sample.warmOriginReads),
        };
        raw.summaries.push(summary);
        console.log(JSON.stringify(summary));
        await writeFile(resolve(output, "raw.json"), `${JSON.stringify(raw, null, 2)}\n`);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
}
if (hash(JSON.stringify(await inventory(fixture))) !== sourceDigest)
  throw new Error("Research source changed during measurement.");
const bytes = `${JSON.stringify(raw, null, 2)}\n`;
await writeFile(resolve(output, "raw.json"), bytes);
if (record) {
  evidence.measurements = [raw];
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(
  `Recorded immutable raw measurements: ${resolve(output, "raw.json")} (sha256 ${hash(bytes)})`,
);

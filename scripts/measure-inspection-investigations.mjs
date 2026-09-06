import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import { chromium, firefox, webkit } from "@playwright/test";
import { build } from "vite";
import { format, resolveConfig } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, ".git/jqstar/inspection-investigations");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = [
  "test/fixtures/inspection-investigations.mjs",
  "scripts/measure-inspection-investigations.mjs",
  "registry/blocks/project-browser.ts",
  "registry/blocks/project-browser.html",
  "registry/blocks/audit-log.ts",
  "registry/blocks/audit-log.html",
  "package-lock.json",
];

function command(name, args, cwd) {
  const result = spawnSync(name, args, { cwd, encoding: "utf8", timeout: 180000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} failed: ${result.error?.message ?? result.stderr}`);
  }
  return result.stdout;
}

async function compileConsumer(consumer, app) {
  const modules = [];
  await writeFile(
    join(consumer, `${app}.mjs`),
    `import $ from "jquery";
import { createRenderAdapter } from "jquery-star";
import { attachInspector } from "jquery-star/inspect";
import "./${app}.ts";
import { ${app === "project-browser" ? "investigateProjectBrowser" : "investigateAuditLog"} as investigate } from "./investigations.mjs";
window.runInvestigation = () => investigate({ $, attachInspector, createRenderAdapter });
`,
  );
  await build({
    configFile: false,
    root: consumer,
    logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        name: "inspection-investigation-graph",
        generateBundle(_options, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === "chunk") modules.push(...Object.keys(chunk.modules));
          }
        },
      },
    ],
    build: {
      outDir: join(consumer, "build"),
      emptyOutDir: false,
      lib: { entry: join(consumer, `${app}.mjs`), formats: ["es"], fileName: () => `${app}.js` },
      target: "es2022",
    },
  });
  assert(modules.some((path) => path.includes("node_modules/jquery-star/dist/inspect.js")));
  assert(modules.every((path) => !path.startsWith(join(root, "src"))));
  assert(modules.every((path) => path.startsWith(`${consumer}/`)));
  return modules.map((path) => relative(consumer, path).replaceAll("\\", "/")).sort();
}

async function main() {
  const consumer = await realpath(
    await mkdtemp(join(tmpdir(), "jqstar-inspection-investigations-")),
  );
  let server;
  let browser;
  const report = {
    schema: "jqstar-inspection-investigations/1",
    recordedAt: new Date().toISOString(),
    rows: [],
  };
  try {
    await mkdir(output, { recursive: true });
    const [pack] = JSON.parse(
      command("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", consumer], root),
    );
    const archive = join(consumer, pack.filename);
    report.package = {
      name: pack.name,
      version: pack.version,
      sha256: sha256(await readFile(archive)),
    };
    report.source = command("git", ["rev-parse", "HEAD"], root).trim();
    report.inputs = Object.fromEntries(
      await Promise.all(
        paths.map(async (path) => [path, sha256(await readFile(join(root, path)))]),
      ),
    );
    await writeFile(
      join(consumer, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    );
    command(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", archive, "jquery@4.0.0"],
      consumer,
    );
    const installed = join(consumer, "node_modules/jquery-star");
    const manifest = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
    assert.equal(manifest.version, pack.version);
    assert.equal(manifest.exports["./devtools"], undefined);
    assert(pack.files.every(({ path }) => !/devtools|inspection-investigations/.test(path)));
    report.absence = { devtoolsExport: false, devtoolsPackedFiles: 0, repositoryRuntimeImports: 0 };
    report.graphs = {};
    const content = new Map();
    await cp(join(root, paths[0]), join(consumer, "investigations.mjs"));
    for (const app of ["project-browser", "audit-log"]) {
      await cp(join(installed, `registry/blocks/${app}.ts`), join(consumer, `${app}.ts`));
      report.graphs[app] = await compileConsumer(consumer, app);
      content.set(`/${app}.js`, [
        "text/javascript",
        await readFile(join(consumer, `build/${app}.js`)),
      ]);
      const markup = await readFile(join(installed, `registry/blocks/${app}.html`), "utf8");
      content.set(`/${app}`, [
        "text/html",
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Inspection investigation</title></head><body>${markup}<script type="module" src="/${app}.js"></script></body></html>`,
      ]);
    }
    let requests = 0;
    server = createServer((request, response) => {
      const route = new URL(request.url, "http://localhost").pathname;
      if (route === "/api/demo/access/audit") {
        requests++;
        if (requests % 2 === 1) {
          response.writeHead(503, { "content-type": "text/plain" });
          response.end("private-investigation-backend-response");
          return;
        }
        const stream = ServerSentEventGenerator.stream((events) =>
          events.patchSignals(
            JSON.stringify({
              auditLogCount: 1,
              auditLogMessage: "1 access event. Page 1 of 1.",
              auditLogPage: 1,
            }),
          ),
        );
        response.writeHead(200, Object.fromEntries(stream.headers));
        stream.text().then(
          (body) => response.end(body),
          () => response.destroy(),
        );
        return;
      }
      const entry = content.get(route);
      response.writeHead(entry ? 200 : 404, { "content-type": entry?.[0] ?? "text/plain" });
      response.end(entry?.[1] ?? "Missing fixture");
    });
    await new Promise((done, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", done);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
      browser = await launcher.launch({ timeout: 30000 });
      for (const app of ["project-browser", "audit-log"]) {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${origin}/${app}`, { timeout: 30000 });
        await page.waitForFunction(() => typeof globalThis.runInvestigation === "function", {
          timeout: 15000,
        });
        const result = await page.evaluate(() => globalThis.runInvestigation());
        assert.deepEqual(errors, []);
        report.rows.push({ engine, version: browser.version(), app, ...result });
        process.stdout.write(
          `${engine}: ${app} resolved; ${result.publicReads} reads; ${result.elapsedMs.toFixed(1)} ms execution\n`,
        );
        await page.close();
      }
      await browser.close();
      browser = undefined;
    }
    assert.equal(requests, 6);
    report.backendRequests = requests;
    report.status = "pass";
    await writeFile(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    if (process.argv.includes("--record")) {
      await writeFile(
        join(root, "quality/inspection-decision.json"),
        await format(JSON.stringify(report), {
          ...(await resolveConfig(join(root, "quality/inspection-decision.json"))),
          parser: "json",
        }),
      );
    }
    process.stdout.write(`Inspection investigation evidence: ${join(output, "report.json")}\n`);
  } finally {
    await browser?.close();
    if (server?.listening) await new Promise((done) => server.close(done));
    await rm(consumer, { recursive: true, force: true });
  }
}

await main();

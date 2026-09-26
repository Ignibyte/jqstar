import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";

const [tarballArgument, temporaryArgument] = process.argv.slice(2);
if (!tarballArgument || !temporaryArgument) {
  throw new Error("Expected packed tarball and owned temporary directory.");
}

const tarball = resolve(tarballArgument);
const consumer = resolve(temporaryArgument, "jquery-371-consumer");
const installedPackage = join(consumer, "node_modules/jquery-star");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const jqueryVersion = "3.7.1";
const peerRange = ">=3.7.1 <5";
const cspPolicy =
  "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function command(name, executable, args) {
  const result = spawnSync(executable, args, {
    cwd: consumer,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" },
  });
  assert(
    !result.error && result.status === 0,
    `${name} failed: ${result.error ?? result.status}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

const markup = `<section id="app" data-signals="{ count: 1 }"><button id="increment" data-on:click="$count++">Increment</button><output id="count" data-text="$count"></output></section><button id="toggle" data-jqs="toggle">Toggle</button><section id="carousel" data-jqs="carousel" data-value="intro"><div data-part="content"><div data-part="slide" data-value="intro">Intro</div><div data-part="slide" data-value="details">Details</div></div><button id="carousel-next" data-part="next">Next slide</button></section><output id="result"></output>`;
const browserProof = `
async function prove($, library) {
  if (window.jQuery !== $ || window.$ !== $ || $.fn.jquery !== "3.7.1") throw new Error("jQuery identity/version differs");
  library.installStar($);
  $.star.boot("#app");
  const instance = $("#app").star("instance");
  document.querySelector("#increment").click();
  await $.star.nextUpdate();
  if (document.querySelector("#count").textContent !== "2") throw new Error("Reactive event/signal boundary failed");
  $.star.ui.enhance(document);
  document.querySelector("#toggle").click();
  if (document.querySelector("#toggle").getAttribute("aria-pressed") !== "true") throw new Error("UI toggle failed");
  const carousel = document.querySelector("#carousel");
  document.querySelector("#carousel-next").click();
  if ($.star.ui.carousel.value(carousel) !== "details" || carousel.dataset.value !== "details" || !carousel.querySelector('[data-part="slide"][data-value="intro"]').hidden) throw new Error("UI Carousel slots failed");
  await instance.run($.star.get("/api", { profile: "core.datastar" }));
  if (instance.state.count !== 7) throw new Error("Datastar profile response failed");
  $("#app").star("destroy");
  document.querySelector("#result").textContent = "3.7.1:2:true:details:7:true";
}`;

async function proveNodeConsumers() {
  const globals = `const { JSDOM } = await import("jsdom"); const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" }); globalThis.window = dom.window; for (const key of Object.getOwnPropertyNames(dom.window)) if (!(key in globalThis)) Object.defineProperty(globalThis, key, Object.getOwnPropertyDescriptor(dom.window, key));`;
  const proof = `if ($.fn.jquery !== "3.7.1") throw new Error("Wrong jQuery version"); if (library.installStar($) !== $.star || typeof $.star?.nextUpdate !== "function") throw new Error("jQuery instance changed"); document.body.innerHTML = '<section id="root" data-signals="{ count: 1 }"><button data-on:click="$count++">Add</button><output data-text="$count"></output></section><button id="toggle" data-jqs="toggle">Toggle</button><section id="carousel" data-jqs="carousel" data-value="intro"><div data-part="content"><div data-part="slide" data-value="intro">Intro</div><div data-part="slide" data-value="details">Details</div></div><button id="carousel-next" data-part="next">Next slide</button></section>'; $.star.boot("#root"); document.querySelector("#root button").click(); await $.star.nextUpdate(); if (document.querySelector("#root output").textContent !== "2") throw new Error("Signal/event failed"); $.star.ui.enhance(document); document.querySelector("#toggle").click(); if (document.querySelector("#toggle").getAttribute("aria-pressed") !== "true") throw new Error("UI toggle failed"); const carousel = document.querySelector("#carousel"); document.querySelector("#carousel-next").click(); if ($.star.ui.carousel.value(carousel) !== "details" || carousel.dataset.value !== "details" || !carousel.querySelector('[data-part="slide"][data-value="intro"]').hidden) throw new Error("UI Carousel slots failed"); const instance = $("#root").star("instance"); globalThis.fetch = async () => new Response('{"count":7}', { headers: { "Content-Type": "application/json" } }); await instance.run($.star.get("/api", { profile: "core.datastar" })); if (instance.state.count !== 7) throw new Error("Datastar profile failed"); $("#root").star("destroy"); dom.window.close();`;
  await writeFile(
    join(consumer, "jquery-371-esm.mjs"),
    `${globals}\nconst { default: $ } = await import("jquery"); const library = await import("jquery-star"); ${proof}\n`,
  );
  await writeFile(
    join(consumer, "jquery-371-commonjs.cjs"),
    `(async () => { ${globals} const $ = require("jquery"); const library = require("jquery-star"); ${proof} })().catch(error => { console.error(error); process.exitCode = 1; });\n`,
  );
  command("jQuery 3.7.1 ESM consumer", process.execPath, ["jquery-371-esm.mjs"]);
  command("jQuery 3.7.1 CommonJS consumer", process.execPath, ["jquery-371-commonjs.cjs"]);
}

async function proveBrowserConsumers() {
  const files = new Map([
    ["/jquery.js", join(consumer, "node_modules/jquery/dist/jquery.js")],
    ["/jquery-star.umd.cjs", join(installedPackage, "dist/jquery-star.umd.cjs")],
  ]);
  for (const filename of await readdir(join(installedPackage, "dist"))) {
    if (filename.endsWith(".js"))
      files.set(`/${filename}`, join(installedPackage, "dist", filename));
  }
  const adapter = `import "/jquery.js";
const $ = globalThis.jQuery;
if (!$ || $.fn.jquery !== "3.7.1" || globalThis.$ !== $) throw new Error("jQuery 3.7.1 module adapter failed");
export default $;`;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204, { "Content-Type": "image/x-icon" }).end();
      return;
    }
    if (url.pathname === "/api") {
      const valid =
        request.headers["datastar-request"] === "true" && url.searchParams.has("datastar");
      response.writeHead(valid ? 200 : 400, { "Content-Type": "application/json" });
      response.end('{"count":7}');
      return;
    }
    if (url.pathname === "/csp") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": cspPolicy,
      });
      response.end(`<!doctype html>${markup}<script type="module" src="/csp-app.js"></script>`);
      return;
    }
    if (url.pathname === "/csp-app.js") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(`import $ from "/jquery-module.js";
import { installStarCSP } from "/csp.js";
import { datastarPlugin } from "/datastar.js";
import { uiPlugin } from "/ui.js";
const library = { installStar(peer) {
  const installed = installStarCSP(peer);
  installed.star.use(datastarPlugin);
  installed.star.use(uiPlugin);
  return installed.star;
} };
${browserProof}
prove($, library).catch(error => { document.querySelector("#result").textContent = error.message; throw error; });`);
      return;
    }
    if (url.pathname === "/module") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html>${markup}<script type="importmap">{"imports":{"jquery":"/jquery-module.js"}}</script><script type="module">import $ from "jquery"; import * as library from "/jquery-star.js"; ${browserProof} prove($, library).catch(error => { document.querySelector("#result").textContent = error.message; throw error; });</script>`,
      );
      return;
    }
    if (url.pathname === "/umd") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html>${markup}<script src="/jquery.js"></script><script src="/jquery-star.umd.cjs"></script><script>${browserProof} prove(jQuery, jQueryStar).catch(error => { document.querySelector("#result").textContent = error.message; throw error; });</script>`,
      );
      return;
    }
    if (url.pathname === "/jquery-module.js") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(adapter);
      return;
    }
    const filename = files.get(url.pathname);
    if (!filename) {
      response.writeHead(404).end();
      return;
    }
    try {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(await readFile(filename));
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  assert(address && typeof address !== "string", "Browser proof server did not bind.");
  const origin = `http://127.0.0.1:${address.port}`;
  const engines = [];
  try {
    for (const [name, engine] of [
      ["chromium", chromium],
      ["firefox", firefox],
      ["webkit", webkit],
    ]) {
      const browser = await engine.launch({ timeout: 30_000 });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        for (const format of ["module", "umd", "csp"]) {
          const documentResponse = await page.goto(`${origin}/${format}`);
          if (format === "csp") {
            assert(
              documentResponse?.headers()["content-security-policy"] === cspPolicy,
              `${name} CSP policy changed.`,
            );
          }
          await page.waitForFunction(
            () => (document.querySelector("#result")?.textContent ?? "").length > 0,
            null,
            { timeout: 20_000 },
          );
          const actual = await page.locator("#result").textContent();
          assert(
            actual === "3.7.1:2:true:details:7:true" && errors.length === 0,
            `${name}/${format}: ${actual}; ${errors.join(" | ")}`,
          );
        }
        engines.push({ name, version: browser.version(), status: "pass" });
      } finally {
        await browser.close();
      }
    }
  } finally {
    await new Promise((done) => server.close(done));
  }
  return engines;
}

await mkdir(consumer, { recursive: true });
await writeFile(
  join(consumer, "package.json"),
  `${JSON.stringify({ name: "jqstar-jquery-371-consumer", private: true, type: "module" }, null, 2)}\n`,
);
command("install strict jQuery 3.7.1 consumer", npm, [
  "install",
  "--ignore-scripts",
  "--strict-peer-deps",
  "--no-audit",
  "--no-fund",
  "--package-lock=false",
  "jquery@3.7.1",
  "jsdom@26.1.0",
  tarball,
]);
const installedManifest = JSON.parse(
  await readFile(join(installedPackage, "package.json"), "utf8"),
);
const jqueryManifest = JSON.parse(
  await readFile(join(consumer, "node_modules/jquery/package.json"), "utf8"),
);
assert(
  installedManifest.peerDependencies?.jquery === peerRange,
  "Installed jQStar peer range differs.",
);
assert(jqueryManifest.version === jqueryVersion, "Installed jQuery version differs.");
await proveNodeConsumers();
const engines = await proveBrowserConsumers();
const tarballSha256 = createHash("sha256")
  .update(await readFile(tarball))
  .digest("hex");
process.stdout.write(
  `${JSON.stringify({
    subject: "installed-tarball",
    jqueryVersion,
    peerRange,
    tarballSha256,
    nodeConsumers: ["esm", "commonjs"],
    browserConsumers: ["module", "umd", "csp"],
    browserModuleAdapter: "test-only-umd-module",
    cspPolicy,
    engines,
  })}\n`,
);

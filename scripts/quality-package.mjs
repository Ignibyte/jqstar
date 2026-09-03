import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { chromium, firefox, webkit } from "@playwright/test";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import {
  assertExactPackageDocumentationPaths,
  assertExactCheckSet,
  initializeChecks,
  packageCheckNames,
  recordCheck,
  reportStatus,
} from "./quality/package-release-contracts.mjs";
import { evaluateCurrentBudgetRatchet } from "./quality/budget-ratchet.mjs";
import { cspCodeViolations, inspectCSPGraphs } from "./quality/csp-graph.mjs";
import { createOwnedTemporaryDirectory } from "./quality/lib/owned-temporary-directory.mjs";
import { terminateDescendants } from "./quality/lib/process.mjs";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const runDirectory = resolve(
  process.env.JQS_QUALITY_RUN_DIRECTORY ?? ".git/jqstar/standalone/ticket-0044",
);
const output = join(runDirectory, "package-report.json");
const runId = process.env.JQS_QUALITY_RUN_ID ?? "ticket-0044-standalone";
const sabotage = process.env.JQS_QUALITY_SABOTAGE ?? "";
const report = {
  schema: "jqstar-package-quality/1",
  runId,
  mode: "package",
  package: null,
  checks: initializeChecks(packageCheckNames),
  futureContracts: [],
  status: "error",
};

function execute(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    maxBuffer: 30 * 1024 * 1024,
    stdio: options.stdio ?? "pipe",
  });
}

function command(name, executable, args, options = {}) {
  const result = execute(executable, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${name} failed with exit ${String(result.status)}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function expectedFailure(name, executable, args, expected, options = {}) {
  const result = execute(executable, args, options);
  const diagnostic = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert(result.status !== 0, `${name} unexpectedly passed.`);
  for (const marker of expected) {
    assert(diagnostic.includes(marker), `${name} did not report ${marker}.\n${diagnostic}`);
  }
  return { exitCode: result.status, markers: expected };
}

const record = (name, work) => recordCheck(report, name, work);

async function writeReport() {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, output);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cspPolicy =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; report-uri /csp-report";

async function serveBrowserProof(installedPackage, consumer, identity) {
  const files = new Map([
    ["/axe.js", resolve("node_modules/axe-core/axe.min.js")],
    ["/csp", resolve("e2e/fixtures/csp-proof/index.html")],
    ["/csp-app.js", resolve("e2e/fixtures/csp-proof/app.js")],
    ["/csp-bootstrap.js", resolve("e2e/fixtures/csp-proof/bootstrap.js")],
    ["/csp-proof.css", resolve("e2e/fixtures/csp-proof/style.css")],
    ["/jquery.js", join(consumer, "node_modules/jquery/dist/jquery.js")],
    ["/jquery-module.js", join(consumer, "node_modules/jquery/dist-module/jquery.module.js")],
    ["/jquery-star.js", join(installedPackage, "dist/jquery-star.js")],
    ["/jquery-star.umd.cjs", join(installedPackage, "dist/jquery-star.umd.cjs")],
    [
      "/external-plugin.js",
      join(consumer, "node_modules/@jqstar-fixtures/external-plugin/index.js"),
    ],
  ]);
  for (const filename of await readdir(join(installedPackage, "dist"))) {
    if (filename.endsWith(".js")) {
      files.set(`/${filename}`, join(installedPackage, "dist", filename));
    }
  }
  const cspReports = [];
  const html = `<!doctype html><section id="app" data-signals="{ count: 1 }"><output id="count" data-text="$count"></output><output id="extension" data-proof.umd:label="proof.umd.upper('ready')" data-proof.module:label="proof.module.upper('ready')"></output></section><button id="proof">Count</button><output id="result"></output>`;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const cspResponse =
      url.pathname.startsWith("/csp") ||
      url.pathname === "/axe.js" ||
      url.pathname === "/jquery-module.js" ||
      files.has(url.pathname);
    if (cspResponse) response.setHeader("Content-Security-Policy", cspPolicy);
    if (url.pathname === "/csp-report" && request.method === "POST") {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 4_096) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const item = body?.["csp-report"] ?? body;
        if (cspReports.length < 32 && item && typeof item === "object") {
          cspReports.push({
            blockedURI: item["blocked-uri"] === "eval" ? "eval" : "redacted",
            disposition: item.disposition === "enforce" ? "enforce" : "unknown",
            effectiveDirective: String(item["effective-directive"] ?? "unknown").slice(0, 80),
          });
        }
      } catch {
        // Browser report bodies are supplemental and vary by engine.
      }
      response.writeHead(204).end();
      return;
    }
    if (url.pathname === "/csp-json") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ count: 4, serverMessage: "generic" }));
      return;
    }
    if (url.pathname === "/csp-html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end('<section id="replace" data-text="$count + \':\' + $serverMessage"></section>');
      return;
    }
    if (url.pathname === "/csp-datastar") {
      const sdkResponse = ServerSentEventGenerator.stream((stream) => {
        stream.patchSignals(JSON.stringify({ count: 8, serverMessage: "sdk" }));
        stream.patchElements("<li data-text=\"'SDK patch'\"></li>", {
          selector: "#stream",
          mode: "append",
        });
      });
      for (const [name, value] of sdkResponse.headers) response.setHeader(name, value);
      response.setHeader("Content-Security-Policy", cspPolicy);
      response.writeHead(sdkResponse.status);
      response.end(Buffer.from(await sdkResponse.arrayBuffer()));
      return;
    }
    if (url.pathname === "/csp-redirect") {
      response.writeHead(302, { Location: "/csp-json" }).end();
      return;
    }
    if (url.pathname === "/csp-error") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
      return;
    }
    if (url.pathname === "/csp-slow") {
      const timer = setTimeout(() => {
        if (!response.writableEnded) {
          response.writeHead(204).end();
        }
      }, 5_000);
      request.once("close", () => clearTimeout(timer));
      return;
    }
    if (url.pathname === "/generic-profile" || url.pathname === "/datastar-profile") {
      const accept = request.headers.accept ?? "";
      const datastar = request.headers["datastar-request"];
      const valid =
        url.pathname === "/generic-profile"
          ? datastar === undefined &&
            !url.searchParams.has("datastar") &&
            !accept.includes("text/event-stream")
          : datastar === "true" &&
            url.searchParams.has("datastar") &&
            accept.includes("text/event-stream");
      response.writeHead(valid ? 200 : 400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          profileResult: url.pathname === "/generic-profile" ? "generic" : "datastar",
        }),
      );
      return;
    }
    if (url.pathname === "/umd") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`${html}<script src="/jquery.js"></script><script src="/jquery-star.umd.cjs"></script><script>
        let cleanupCount = 0;
        let middlewareCalls = 0;
        const facade = jQuery.star.use({ name: 'proof.umd', version: '1.0.0', apiVersion: '^0.1.0', install(registrar) {
          registrar.action('proof.umd.run', () => {});
          registrar.requestMiddleware({ id: 'short', handle(request, next, context) { if (new URL(request.url).pathname !== '/middleware') return next(); middlewareCalls += 1; return context.complete(); } });
          registrar.helper('proof.umd.upper', (value) => String(value).toUpperCase());
          registrar.directive({ id: 'proof.umd.label', match: { name: 'data-proof.umd:label' }, mount({ attribute, context, effect, expressions, $element }) {
            const evaluate = expressions.compileValue(attribute.value, { attribute: attribute.name });
            effect(() => $element.text(String(evaluate(context))));
            return () => { cleanupCount += 1; };
          } });
          return { ready: true };
        } });
        document.querySelector('#proof').addEventListener('click', async () => {
          jQuery.star.boot('#app');
          const instance = jQuery('#app').star('instance');
          const stopKernelOperations = jQuery.star.observeOperations(() => {});
          const stopApplicationOperations = instance.observeOperations(() => {});
          const count = document.querySelector('#count').textContent;
          const extension = document.querySelector('#extension').textContent;
          const requestResult = await instance.run(jQuery.star.get('/middleware'));
          if (requestResult !== undefined) throw new Error('UMD middleware short circuit failed');
          let datastarProfileEvents = 0;
          jQuery('#app').on('datastar-fetch', () => { datastarProfileEvents += 1; });
          await instance.run(jQuery.star.get('/generic-profile', { profile: 'core.generic' }));
          await instance.run(jQuery.star.get('/datastar-profile', { profile: 'core.datastar' }));
          stopApplicationOperations();
          stopKernelOperations();
          jQuery('#app').star('destroy');
          document.querySelector('#result').textContent = typeof jQuery.fn.star + ':' + typeof jQueryStar.installStar + ':' + typeof jQuery.star.observeOperations + ':' + typeof instance.observeOperations + ':' + instance.destroyed + ':' + count + ':' + facade.ready + ':' + extension + ':' + cleanupCount + ':' + middlewareCalls + ':' + typeof jQueryStar.StarRequestMiddlewareNextError + ':' + instance.state.profileResult + ':' + (datastarProfileEvents > 0) + ':' + typeof jQueryStar.StarProtocolSelectionError;
        });
      </script>`);
      return;
    }
    if (url.pathname === "/testing") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><button id="proof">Run conformance</button><output id="result"></output>
        <script type="importmap">{"imports":{"jquery":"/jquery-module.js","jquery-star/core":"/core.js","jquery-star/testing":"/testing.js"}}</script>
        <script type="module">
          import $ from "jquery";
          import { createResponseController, createStarHarness, runCoreConformance, runPluginConformance } from "jquery-star/testing";
          import { createCleanupFailingExternalPlugin, createExternalPlugin, createFailingExternalPlugin } from "/external-plugin.js";
          const createHarness = () => createStarHarness({ window, jQuery: $, responses: createResponseController({ window }) });
          document.querySelector("#proof").addEventListener("click", async () => {
            const core = await runCoreConformance(createHarness);
            const plugin = await runPluginConformance({ createHarness, plugin: createExternalPlugin(), failingPlugin: createFailingExternalPlugin(), cleanupFailingPlugin: createCleanupFailingExternalPlugin() });
            document.querySelector("#result").textContent = core.passed + ":" + plugin.passed;
          });
        </script>`);
      return;
    }
    if (url.pathname === "/module") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`${html}<script type="importmap">{"imports":{"jquery":"/jquery-module.js"}}</script><script type="module">
        import $ from 'jquery';
        import { installStar, StarProtocolSelectionError, StarRequestMiddlewareValidationError } from '/jquery-star.js';
        installStar($);
        let cleanupCount = 0;
        let middlewareCalls = 0;
        const facade = $.star.use({ name: 'proof.module', version: '1.0.0', apiVersion: '^0.1.0', install(registrar) {
          registrar.action('proof.module.run', () => {});
          registrar.requestMiddleware({ id: 'short', handle(request, next, context) { if (new URL(request.url).pathname !== '/middleware') return next(); middlewareCalls += 1; return context.complete(); } });
          registrar.helper('proof.module.upper', (value) => String(value).toUpperCase());
          registrar.directive({ id: 'proof.module.label', match: { name: 'data-proof.module:label' }, mount({ attribute, context, effect, expressions, $element }) {
            const evaluate = expressions.compileValue(attribute.value, { attribute: attribute.name });
            effect(() => $element.text(String(evaluate(context))));
            return () => { cleanupCount += 1; };
          } });
          return { ready: true };
        } });
        document.querySelector('#proof').addEventListener('click', async () => {
          $.star.boot('#app');
          const instance = $('#app').star('instance');
          const stopKernelOperations = $.star.observeOperations(() => {});
          const stopApplicationOperations = instance.observeOperations(() => {});
          const count = document.querySelector('#count').textContent;
          const extension = document.querySelector('#extension').textContent;
          const requestResult = await instance.run($.star.get('/middleware'));
          if (requestResult !== undefined) throw new Error('module middleware short circuit failed');
          let datastarProfileEvents = 0;
          $('#app').on('datastar-fetch', () => { datastarProfileEvents += 1; });
          await instance.run($.star.get('/generic-profile', { profile: 'core.generic' }));
          await instance.run($.star.get('/datastar-profile', { profile: 'core.datastar' }));
          stopApplicationOperations();
          stopKernelOperations();
          $('#app').star('destroy');
          document.querySelector('#result').textContent = typeof $.fn.star + ':' + typeof $.star.nextUpdate + ':' + typeof $.star.observeOperations + ':' + typeof instance.observeOperations + ':' + instance.destroyed + ':' + count + ':' + facade.ready + ':' + extension + ':' + cleanupCount + ':' + middlewareCalls + ':' + typeof StarRequestMiddlewareValidationError + ':' + instance.state.profileResult + ':' + (datastarProfileEvents > 0) + ':' + typeof StarProtocolSelectionError;
        });
      </script>`);
      return;
    }
    const file = files.get(url.pathname);
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    try {
      const source = await readFile(file);
      const contentType = file.endsWith(".html")
        ? "text/html; charset=utf-8"
        : file.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "text/javascript; charset=utf-8";
      response.writeHead(200, { "Content-Type": contentType });
      response.end(source);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Browser proof did not bind.");
    const engines = [];
    const cspEngines = [];
    const origin = `http://127.0.0.1:${address.port}`;
    for (const [name, browserType] of [
      ["chromium", chromium],
      ["firefox", firefox],
      ["webkit", webkit],
    ]) {
      const browser = await browserType.launch({ timeout: 30_000 });
      let engineTimedOut = false;
      let forcedClose;
      const engineTimeout = setTimeout(() => {
        engineTimedOut = true;
        void browser
          .close({ reason: `${name} package browser proof exceeded 90 seconds` })
          .catch(() => undefined);
        forcedClose = setTimeout(() => terminateDescendants(process.pid, "SIGKILL"), 5_000);
      }, 90_000);
      let proofError;
      try {
        const page = await browser.newPage();
        const browserErrors = [];
        const cspConsoleMessages = [];
        const cspResponses = [];
        let trackingCSP = false;
        page.on("pageerror", (error) => browserErrors.push(error.message));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          const value = message.text();
          if (
            trackingCSP &&
            ["content security policy", "refused to evaluate", "unsafe-eval"].some((marker) =>
              value.toLowerCase().includes(marker),
            )
          ) {
            cspConsoleMessages.push("blocked dynamic-code canary");
          } else {
            browserErrors.push(value);
          }
        });
        page.on("response", (browserResponse) => {
          if (!trackingCSP || !browserResponse.url().startsWith(origin)) return;
          if (browserResponse.status() >= 300 && browserResponse.status() < 400) return;
          cspResponses.push({
            path: new URL(browserResponse.url()).pathname,
            policy: browserResponse.headers()["content-security-policy"] ?? null,
            status: browserResponse.status(),
          });
        });
        for (const [path, expected] of [
          [
            "/umd",
            "function:function:function:function:true:1:true:READY:1:1:function:datastar:true:function",
          ],
          [
            "/module",
            "function:function:function:function:true:1:true:READY:1:1:function:datastar:true:function",
          ],
          ["/testing", "3:3"],
        ]) {
          await page.goto(`http://127.0.0.1:${address.port}${path}`);
          await page.locator("#proof").click();
          await page.waitForFunction(
            () => (document.querySelector("#result")?.textContent ?? "").length > 0,
          );
          const actual = await page.locator("#result").textContent();
          assert(
            actual === expected,
            `${name} ${path} consumer returned ${String(actual)}. ${browserErrors.join(" ")}`,
          );
        }
        cspReports.length = 0;
        trackingCSP = true;
        const documentResponse = await page.goto(`${origin}/csp`);
        assert(documentResponse, `${name} CSP document returned no response.`);
        assert(
          documentResponse.headers()["content-security-policy"] === cspPolicy,
          `${name} CSP document policy differs from the frozen header.`,
        );
        await page.waitForTimeout(100);
        assert(browserErrors.length === 0, `${name} CSP boot errors: ${browserErrors.join(" ")}`);
        assert(
          (await page.locator("html").getAttribute("data-jqstar-csp-ready")) === "true",
          `${name} CSP application did not finish booting.`,
        );
        await page.locator("#increment").focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.querySelector("#count")?.textContent === "2");
        assert(
          (await page.locator("#increment").getAttribute("data-fired")) === "yes",
          `${name} CSP jQuery method did not run from keyboard activation.`,
        );
        assert(
          (await page.evaluate(() => document.activeElement?.id)) === "increment",
          `${name} CSP interaction lost focus.`,
        );
        const cspResult = await page.evaluate(() => window.__finishJQStarCSPProof());
        assert(cspResult.grammarVersion === identity.grammarVersion, `${name} grammar changed.`);
        assert(cspResult.corpusDigest === identity.corpusDigest, `${name} corpus digest changed.`);
        assert(
          JSON.stringify(cspResult.state) ===
            JSON.stringify({
              asyncMessage: "settled",
              count: 8,
              saved: true,
              serverMessage: "sdk",
            }),
          `${name} CSP state proof failed: ${JSON.stringify(cspResult.state)}.`,
        );
        assert(cspResult.dom.fired === "yes", `${name} CSP jQuery proof failed.`);
        assert(cspResult.dom.helper === "SDK", `${name} CSP helper proof failed.`);
        assert(
          cspResult.dom.htmlText === "4:generic",
          `${name} CSP HTML patch proof returned ${JSON.stringify(cspResult.dom.htmlText)}.`,
        );
        assert(cspResult.dom.stream === "SDK patch", `${name} CSP Datastar proof failed.`);
        assert(cspResult.dom.togglePressed === "true", `${name} CSP UI proof failed.`);
        assert(
          cspResult.deniedCode === "CSP_CAPABILITY_IDENTIFIER",
          `${name} CSP denial diagnostic failed.`,
        );
        assert(cspResult.slowResult === "cancelled", `${name} CSP cancellation proof failed.`);
        assert(
          cspResult.operations.includes("request:cancelled"),
          `${name} CSP operations omit request cancellation.`,
        );
        assert(
          cspResult.disposal.failed === 0 && cspResult.disposal.remaining === 0,
          `${name} CSP disposal retained or failed resources.`,
        );
        assert(
          cspResult.disposal.attempted === cspResult.disposal.released,
          `${name} CSP disposal did not release every attempted resource.`,
        );
        assert(
          cspResult.accessibilityViolations.length === 0,
          `${name} CSP axe violations: ${cspResult.accessibilityViolations.join(", ")}.`,
        );
        const errorResponse = await page.request.get(`${origin}/csp-error`);
        cspResponses.push({
          path: "/csp-error",
          policy: errorResponse.headers()["content-security-policy"] ?? null,
          status: errorResponse.status(),
        });
        const redirectResponse = await page.request.get(`${origin}/csp-redirect`, {
          maxRedirects: 0,
        });
        cspResponses.push({
          path: "/csp-redirect",
          policy: redirectResponse.headers()["content-security-policy"] ?? null,
          status: redirectResponse.status(),
        });
        assert(
          errorResponse.status() === 404 &&
            redirectResponse.status() === 302 &&
            redirectResponse.headers().location === "/csp-json" &&
            cspResult.endpointStatus.redirect === 200,
          `${name} CSP error/redirect proof failed.`,
        );
        assert(cspResult.canary.blocked, `${name} CSP dynamic-code canary was not blocked.`);
        assert(cspResult.instrumentation, `${name} CSP policy instrumentation is missing.`);
        assert(
          Object.values(cspResult.runtimeCalls).every((count) => count === 0),
          `${name} CSP runtime reached a dynamic-code primitive.`,
        );
        const unexpectedEvents = cspResult.events.filter(
          (event) =>
            event.blockedURI !== "eval" || !event.effectiveDirective.startsWith("script-src"),
        );
        const unexpectedReports = cspReports.filter(
          (event) =>
            event.blockedURI !== "eval" || !event.effectiveDirective.startsWith("script-src"),
        );
        assert(unexpectedEvents.length === 0, `${name} recorded unexpected CSP events.`);
        assert(unexpectedReports.length === 0, `${name} recorded unexpected CSP reports.`);
        assert(browserErrors.length === 0, `${name} CSP page errors: ${browserErrors.join(" ")}`);
        assert(cspResponses.length > 0, `${name} recorded no CSP response headers.`);
        assert(
          cspResponses.every(({ policy }) => policy === cspPolicy),
          `${name} found changed CSP response headers: ${JSON.stringify(
            cspResponses.filter(({ policy }) => policy !== cspPolicy),
          )}.`,
        );

        const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
        try {
          const nativePage = await noJavaScript.newPage();
          const nativeResponse = await nativePage.goto(`${origin}/csp`);
          assert(
            nativeResponse?.headers()["content-security-policy"] === cspPolicy,
            `${name} no-JavaScript document policy differs.`,
          );
          assert(
            (await nativePage.locator("#native-link").getAttribute("href")) === "/csp-destination",
            `${name} no-JavaScript link is unavailable.`,
          );
          assert(
            await nativePage.locator("#native-name").isEditable(),
            `${name} native form failed.`,
          );
          assert(
            (await nativePage.locator("#result").textContent()) === "Running",
            `${name} ran JS.`,
          );
        } finally {
          await noJavaScript.close();
        }
        cspEngines.push({
          name,
          version: browser.version(),
          status: "pass",
          headerResponses: cspResponses.length,
          policyEvents: cspResult.events.length,
          policyReports: cspReports.length,
          expectedCanaryConsoleMessages: cspConsoleMessages.length,
          unexpectedPolicyEvents: unexpectedEvents.length,
          unexpectedPolicyReports: unexpectedReports.length,
          operationCount: cspResult.operations.length,
          disposal: cspResult.disposal,
          noJavaScript: "native-link-and-form",
        });
        engines.push({ name, status: "pass", version: browser.version() });
      } catch (error) {
        proofError = engineTimedOut
          ? new Error(`${name} package browser proof timed out after 90 seconds.`, {
              cause: error,
            })
          : error;
      } finally {
        clearTimeout(engineTimeout);
        if (forcedClose) clearTimeout(forcedClose);
        let closeTimedOut = false;
        const closeTimeout = setTimeout(() => {
          closeTimedOut = true;
          terminateDescendants(process.pid, "SIGKILL");
        }, 5_000);
        try {
          await browser.close();
        } catch (error) {
          proofError ??= new Error(`${name} package browser cleanup failed.`, { cause: error });
        } finally {
          clearTimeout(closeTimeout);
        }
        if (closeTimedOut) {
          proofError ??= new Error(`${name} package browser cleanup timed out after 5 seconds.`);
        }
      }
      if (proofError) throw proofError;
    }
    return {
      subject: "installed-tarball",
      consumers: ["module", "umd", "testing", "csp"],
      lifecycle: "boot-and-dispose",
      engines,
      csp: {
        schema: "jqstar-csp-browser/1",
        policy: cspPolicy,
        packageVersion: identity.packageVersion,
        grammarVersion: identity.grammarVersion,
        corpusDigest: identity.corpusDigest,
        sourceDigest: identity.graph.source.digest,
        tarballDigest: identity.tarballDigest,
        bundleDigests: {
          esm: identity.graph.formats.esm.digest,
          commonjs: identity.graph.formats.commonjs.digest,
        },
        formats: ["esm", "commonjs"],
        engines: cspEngines,
      },
    };
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

const ownedTemporary = await createOwnedTemporaryDirectory({ prefix: "jqstar-package-quality-" });
const temporary = ownedTemporary.directory;
const packDirectory = join(temporary, "pack");
const extracted = join(temporary, "package-subject", "package");
const consumer = join(temporary, "consumer");
try {
  await mkdir(packDirectory, { recursive: true });
  await mkdir(dirname(extracted), { recursive: true });
  await mkdir(consumer, { recursive: true });

  await record("build", () => {
    command("package build", npm, ["run", "build:self-hosted"]);
    return "npm run build:self-hosted";
  });

  await record("api-report", async () => {
    command("API Extractor and declaration rollup", process.execPath, ["scripts/build-types.mjs"]);
    const declaration = await readFile("dist/index.d.ts", "utf8");
    const commonJsDeclaration = await readFile("dist/index.d.cts", "utf8");
    const apiReport = await readFile("etc/jquery-star.api.md", "utf8");
    for (const marker of [
      "interface JQueryStarJQuery",
      "interface JQueryStarJQueryStatic",
      "interface JQuery extends JQueryStarJQuery {}",
      "interface JQueryStatic extends JQueryStarJQueryStatic {}",
    ]) {
      assert(declaration.includes(marker), `Rolled-up declaration omits ${marker}.`);
    }
    for (const marker of ["interface JQueryStarJQuery", "interface JQueryStarJQueryStatic"]) {
      assert(apiReport.includes(marker), `Reviewed API report omits ${marker}.`);
    }
    assert(
      commonJsDeclaration === 'export * from "./index.js";\n',
      "The CommonJS declaration does not delegate to the reviewed ESM declaration.",
    );
    return {
      apiReport: "etc/jquery-star.api.md",
      declaration: "dist/index.d.ts",
      jqueryAugmentation: true,
      sha256: createHash("sha256").update(declaration).digest("hex"),
    };
  });

  let tarball = "";
  let pack = null;
  await record("pack", () => {
    const result = command("npm pack", npm, [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      packDirectory,
    ]);
    const parsed = JSON.parse(result.stdout);
    pack = parsed[0];
    assert(pack?.filename, "npm pack returned no tarball filename.");
    tarball = join(packDirectory, pack.filename);
    command("extract package", "tar", ["-xzf", tarball, "-C", dirname(extracted)]);
    report.package = {
      filename: pack.filename,
      files: pack.files.length,
      packedBytes: pack.size,
      unpackedBytes: pack.unpackedSize,
    };
    return report.package;
  });

  let budgets = null;
  await record("package-budgets", async () => {
    budgets = JSON.parse(await readFile("config/quality-budgets.json", "utf8"));
    const ratchet = await evaluateCurrentBudgetRatchet(budgets);
    assert(
      ratchet.status !== "fail",
      `Quality budget ratchet failed: ${ratchet.failures.join(" ")}`,
    );
    assert(pack, "Package metadata is unavailable.");
    const packageBudget =
      sabotage === "package-budget" ? { ...budgets.package, packedBytes: 1 } : budgets.package;
    const cspPackageBudget = budgets.cspPackage;
    const turboPackageBudget = budgets.turboPackage;
    assert(
      pack.size <=
        packageBudget.packedBytes + cspPackageBudget.packedBytes + turboPackageBudget.packedBytes,
      `Packed bytes ${pack.size} exceed ${packageBudget.packedBytes} base plus ${cspPackageBudget.packedBytes} CSP and ${turboPackageBudget.packedBytes} Turbo allowances.`,
    );
    assert(
      pack.unpackedSize <=
        packageBudget.unpackedBytes +
          cspPackageBudget.unpackedBytes +
          turboPackageBudget.unpackedBytes,
      `Unpacked bytes ${pack.unpackedSize} exceed ${packageBudget.unpackedBytes} base plus ${cspPackageBudget.unpackedBytes} CSP and ${turboPackageBudget.unpackedBytes} Turbo allowances.`,
    );
    assert(
      pack.files.length <= packageBudget.files,
      `File count ${pack.files.length} exceeds ${packageBudget.files}.`,
    );
    const sizes = {};
    for (const [path, maximum] of Object.entries(budgets.bundles)) {
      const bytes = (await stat(join(extracted, path))).size;
      sizes[path] = bytes;
      assert(bytes <= maximum, `${path} is ${bytes} bytes; budget is ${maximum}.`);
    }
    return {
      ratchet,
      measurements: {
        files: pack.files.length,
        packedBytes: pack.size,
        unpackedBytes: pack.unpackedSize,
        bundles: sizes,
      },
    };
  });

  await record("exports-and-files", async () => {
    const manifest = JSON.parse(await readFile(join(extracted, "package.json"), "utf8"));
    assert(manifest.name === "jquery-star", "Packed package name changed.");
    assert(
      manifest.scripts?.prepack === "npm run build:self-hosted",
      "Packed prepack contract is missing.",
    );
    assert(
      manifest.version === JSON.parse(await readFile("package.json", "utf8")).version,
      "Packed version differs from source.",
    );
    for (const path of [
      "dist/core.cjs",
      "dist/core.cjs.map",
      "dist/core.d.cts",
      "dist/core.d.ts",
      "dist/core.js",
      "dist/core.js.map",
      "dist/csp.cjs",
      "dist/csp.cjs.map",
      "dist/csp.d.cts",
      "dist/csp.d.ts",
      "dist/csp.js",
      "dist/csp.js.map",
      "dist/datastar.cjs",
      "dist/datastar.cjs.map",
      "dist/datastar.d.cts",
      "dist/datastar.d.ts",
      "dist/datastar.js",
      "dist/datastar.js.map",
      "dist/datastar-testing.cjs",
      "dist/datastar-testing.cjs.map",
      "dist/datastar-testing.d.cts",
      "dist/datastar-testing.d.ts",
      "dist/datastar-testing.js",
      "dist/datastar-testing.js.map",
      "dist/index.d.ts",
      "dist/index.d.cts",
      "dist/jquery-star.cjs",
      "dist/jquery-star.cjs.map",
      "dist/jquery-star.js",
      "dist/jquery-star.js.map",
      "dist/jquery-star.umd.cjs",
      "dist/jquery-star.umd.cjs.map",
      "dist/jquery-star-ui.css",
      "dist/testing.cjs",
      "dist/testing.cjs.map",
      "dist/testing.d.cts",
      "dist/testing.d.ts",
      "dist/testing.js",
      "dist/testing.js.map",
      "dist/turbo.cjs",
      "dist/turbo.cjs.map",
      "dist/turbo.d.cts",
      "dist/turbo.d.ts",
      "dist/turbo.js",
      "dist/turbo.js.map",
      "dist/ui.cjs",
      "dist/ui.cjs.map",
      "dist/ui.d.cts",
      "dist/ui.d.ts",
      "dist/ui.js",
      "dist/ui.js.map",
      "bin/jqstar.mjs",
      "registry.json",
      "docs/BACKEND.md",
      "docs/COMPONENT_ARCHITECTURE.md",
      "docs/COMPONENT_RESEARCH.md",
      "docs/CSP_EXPRESSIONS.md",
      "docs/INTEROPERABILITY.md",
      "docs/SELF_HOSTING.md",
      "docs/security/CSP_THREAT_MODEL.md",
      "SECURITY.md",
    ])
      await access(join(extracted, path));
    assert(pack, "Package metadata is unavailable.");
    const documentation = assertExactPackageDocumentationPaths(pack.files.map(({ path }) => path));
    assert(
      manifest.exports?.["."]?.import?.default === "./dist/jquery-star.js",
      "Root ESM export is wrong.",
    );
    assert(
      manifest.exports?.["."]?.require?.default === "./dist/jquery-star.umd.cjs",
      "Root CommonJS export is wrong.",
    );
    assert(
      manifest.exports?.["."]?.import?.types === "./dist/index.d.ts",
      "Root ESM type export is wrong.",
    );
    assert(
      manifest.exports?.["."]?.require?.types === "./dist/index.d.cts",
      "Root CommonJS type export is wrong.",
    );
    for (const entry of ["core", "csp", "ui", "datastar", "turbo"]) {
      const exported = manifest.exports?.[`./${entry}`];
      assert(exported?.import?.default === `./dist/${entry}.js`, `${entry} ESM export is wrong.`);
      assert(
        exported?.require?.default === `./dist/${entry}.cjs`,
        `${entry} CommonJS export is wrong.`,
      );
      assert(
        exported?.import?.types === `./dist/${entry}.d.ts`,
        `${entry} ESM type export is wrong.`,
      );
      assert(
        exported?.require?.types === `./dist/${entry}.d.cts`,
        `${entry} CommonJS type export is wrong.`,
      );
    }
    for (const [subpath, artifact] of [
      ["testing", "testing"],
      ["datastar/testing", "datastar-testing"],
    ]) {
      const exported = manifest.exports?.[`./${subpath}`];
      assert(
        exported?.import?.default === `./dist/${artifact}.js`,
        `${subpath} ESM export is wrong.`,
      );
      assert(
        exported?.require?.default === `./dist/${artifact}.cjs`,
        `${subpath} CommonJS export is wrong.`,
      );
      assert(
        exported?.import?.types === `./dist/${artifact}.d.ts`,
        `${subpath} ESM type export is wrong.`,
      );
      assert(
        exported?.require?.types === `./dist/${artifact}.d.cts`,
        `${subpath} CommonJS type export is wrong.`,
      );
    }
    assert(manifest.exports?.["./ui.css"] === "./dist/jquery-star-ui.css", "CSS export is wrong.");
    report.futureContracts = [];
    return { exports: Object.keys(manifest.exports), version: manifest.version, documentation };
  });

  await record("publint", () => {
    command("publint", npx, ["--no-install", "publint", "run", tarball, "--strict"]);
    return "strict";
  });

  await record("are-the-types-wrong", () => {
    command("Are the Types Wrong", npx, [
      "--no-install",
      "attw",
      tarball,
      "--profile",
      "node16",
      "--no-definitely-typed",
      "--format",
      "table",
      "--entrypoints",
      ".",
      "./core",
      "./csp",
      "./ui",
      "./datastar",
      "./testing",
      "./turbo",
      "./datastar/testing",
    ]);
    return "node16 profile across root, core, CSP, UI, Datastar, testing, and Turbo entries";
  });

  await record("refresh-package-subject", () => {
    command("refresh extracted package", "tar", ["-xzf", tarball, "-C", dirname(extracted)]);
    return "restored after external tarball linters";
  });

  await record("installed-consumer", async () => {
    const installedManifest = JSON.parse(await readFile(join(extracted, "package.json"), "utf8"));
    const jqueryPeer = installedManifest.peerDependencies?.jquery;
    const turboPeer = installedManifest.peerDependencies?.["@hotwired/turbo"];
    assert(jqueryPeer === ">=4.0.0 <5", "Packed jQuery peer range changed.");
    assert(turboPeer === ">=8.0.21 <8.1.0", "Packed Turbo peer range changed.");
    assert(
      installedManifest.peerDependenciesMeta?.["@hotwired/turbo"]?.optional === true,
      "Packed Turbo peer must remain optional.",
    );
    await writeFile(
      join(consumer, "package.json"),
      `${JSON.stringify({ name: "jqstar-installed-consumer", private: true, type: "module" }, null, 2)}\n`,
    );
    command(
      "install consumer tools",
      npm,
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        "jquery@4.0.0",
        "@types/jquery@3.5.32",
        "jsdom@26.1.0",
        "qunit@2.26.0",
        "typescript@5.9.3",
        "vite@7.3.6",
      ],
      { cwd: consumer },
    );

    const missingPeer = join(temporary, "missing-peer");
    await mkdir(missingPeer, { recursive: true });
    await writeFile(
      join(missingPeer, "package.json"),
      `${JSON.stringify({ name: "jqstar-missing-peer", private: true, type: "module" }, null, 2)}\n`,
    );
    command(
      "install package without peer",
      npm,
      [
        "install",
        "--ignore-scripts",
        "--legacy-peer-deps",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        tarball,
      ],
      { cwd: missingPeer },
    );
    await writeFile(join(missingPeer, "import.mjs"), 'await import("jquery-star");\n');
    const missingPeerEvidence = expectedFailure(
      "missing jQuery peer import",
      process.execPath,
      ["import.mjs"],
      ["jquery"],
      { cwd: missingPeer },
    );

    const incompatiblePeer = join(temporary, "incompatible-peer");
    await mkdir(incompatiblePeer, { recursive: true });
    await writeFile(
      join(incompatiblePeer, "package.json"),
      `${JSON.stringify({ name: "jqstar-incompatible-peer", private: true }, null, 2)}\n`,
    );
    const incompatiblePeerEvidence = expectedFailure(
      "incompatible jQuery peer install",
      npm,
      [
        "install",
        "--ignore-scripts",
        "--strict-peer-deps",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        "jquery@3.7.1",
        tarball,
      ],
      ["ERESOLVE", "jquery"],
      { cwd: incompatiblePeer },
    );
    const packFixture = (name, directory) => {
      const packed = command(name, npm, [
        "pack",
        directory,
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        packDirectory,
      ]);
      const parsed = JSON.parse(packed.stdout)[0];
      assert(parsed?.filename, `${name} returned no tarball filename.`);
      return join(packDirectory, parsed.filename);
    };
    const externalPluginTarball = packFixture(
      "pack external plugin fixture",
      join(root, "test/fixtures/external-plugin"),
    );
    const navigationPluginTarball = packFixture(
      "pack navigation plugin fixture",
      join(root, "test/fixtures/mock-navigation-plugin"),
    );
    command(
      "install tarball consumer",
      npm,
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        tarball,
        externalPluginTarball,
        navigationPluginTarball,
      ],
      { cwd: consumer },
    );
    const cliVersion = command(
      "installed CLI version",
      process.execPath,
      [join(consumer, "node_modules/jquery-star/bin/jqstar.mjs"), "--version"],
      { cwd: consumer },
    );
    assert(
      cliVersion.stdout.trim() === installedManifest.version,
      "Installed CLI version differs from the packed manifest.",
    );

    const globals = `const { JSDOM } = await import("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
globalThis.window = dom.window;
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) Object.defineProperty(globalThis, key, Object.getOwnPropertyDescriptor(dom.window, key));
}`;
    await writeFile(
      join(consumer, "esm.mjs"),
      `${globals}
const { default: $ } = await import("jquery");
const library = await import("jquery-star");
library.installStar($);
if (typeof $.fn.star !== "function" || typeof $.star.nextUpdate !== "function") throw new Error("ESM installation failed");
if (library.STAR_PLUGIN_API_VERSION !== "0.1.0") throw new Error("ESM plugin API version export failed");
document.body.innerHTML = '<section id="extension-root"><output data-proof.esm:label="proof.esm.upper(&quot;ready&quot;)"></output></section>';
let extensionCleanups = 0;
let middlewareCalls = 0;
const kernelOperations = [];
const pluginOperations = [];
const stopKernelOperations = $.star.observeOperations((operation) => kernelOperations.push(operation));
const pluginFacade = $.star.use({ name: "proof.esm", version: "1.0.0", apiVersion: "^0.1.0", install(registrar) {
  registrar.action("proof.esm.run", () => {});
  registrar.requestMiddleware({ id: "short", handle(request, next, context) { if (new URL(request.url).pathname !== "/middleware") return next(); middlewareCalls += 1; return context.complete(); } });
  registrar.observeOperations((operation) => pluginOperations.push(operation));
  registrar.helper("proof.esm.upper", (value) => String(value).toUpperCase());
  registrar.directive({ id: "proof.esm.label", match: { name: "data-proof.esm:label" }, mount({ attribute, context, effect, expressions, $element }) {
    const evaluate = expressions.compileValue(attribute.value, { attribute: attribute.name });
    effect(() => $element.text(String(evaluate(context))));
    return () => { extensionCleanups += 1; };
  } });
  return { ready: true };
} });
if (pluginFacade.ready !== true) throw new Error("ESM plugin facade failed");
$.star.boot("#extension-root");
const esmInstance = $("#extension-root").star("instance");
const applicationOperations = [];
const stopApplicationOperations = esmInstance.observeOperations((operation) => applicationOperations.push(operation));
await esmInstance.run("proof.esm.run");
if (kernelOperations.length !== 2 || applicationOperations.length !== 2 || pluginOperations.length !== 2) throw new Error("ESM operation observers failed");
if (kernelOperations[0].id !== kernelOperations[1].id || JSON.stringify(kernelOperations).includes("Response")) throw new Error("ESM operation record contract failed");
const requestResult = await esmInstance.run($.star.get("/middleware"));
if (requestResult !== undefined || middlewareCalls !== 1) throw new Error("ESM request middleware failed");
if (kernelOperations.slice(-3).map(({ phase }) => phase).join(":") !== "started:completed:completed") throw new Error("ESM middleware operation contract failed");
if (typeof library.StarRequestMiddlewareNextError !== "function" || typeof library.StarRequestMiddlewareValidationError !== "function") throw new Error("ESM middleware error exports failed");
const protocolCalls = [];
globalThis.fetch = async (url, init) => {
  protocolCalls.push([url, init]);
  const result = new URL(url).pathname === "/generic-profile" ? "generic" : "datastar";
  return new Response(JSON.stringify({ profileResult: result }), { headers: { "Content-Type": "application/json" } });
};
let datastarProfileEvents = 0;
$("#extension-root").on("datastar-fetch", () => { datastarProfileEvents += 1; });
await esmInstance.run($.star.get("/generic-profile", { profile: "core.generic" }));
await esmInstance.run($.star.get("/datastar-profile", { profile: "core.datastar" }));
const [genericURL, genericInit] = protocolCalls[0];
const [datastarURL, datastarInit] = protocolCalls[1];
if (new URL(genericURL).searchParams.has("datastar") || new Headers(genericInit.headers).has("Datastar-Request")) throw new Error("ESM generic profile leaked Datastar bytes");
if (!new URL(datastarURL).searchParams.has("datastar") || new Headers(datastarInit.headers).get("Datastar-Request") !== "true") throw new Error("ESM Datastar profile bytes failed");
if (esmInstance.state.profileResult !== "datastar" || datastarProfileEvents === 0) throw new Error("ESM profile response/event contract failed");
if (typeof library.StarProtocolBodyOwnershipError !== "function" || typeof library.StarProtocolSelectionError !== "function" || typeof library.StarProtocolValidationError !== "function") throw new Error("ESM protocol error exports failed");
stopApplicationOperations();
stopApplicationOperations();
stopKernelOperations();
if (document.querySelector("output")?.textContent !== "READY") throw new Error("ESM directive/helper failed");
$("#extension-root").star("destroy");
if (extensionCleanups !== 1) throw new Error("ESM directive cleanup failed");
const expressionEngine = library.createTrustedExpressionEngine();
if (typeof expressionEngine.compileValue !== "function" || typeof expressionEngine.dispose !== "function") throw new Error("ESM expression-engine export failed");
expressionEngine.dispose();
let privateBlocked = false;
try { await import("jquery-star/dist/index.js"); } catch (error) { privateBlocked = error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"; }
if (!privateBlocked) throw new Error("A private package path escaped the export map");
`,
    );
    command("ESM consumer", process.execPath, ["esm.mjs"], { cwd: consumer });

    await writeFile(
      join(consumer, "commonjs.cjs"),
      `(async () => {
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
globalThis.window = dom.window;
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) Object.defineProperty(globalThis, key, Object.getOwnPropertyDescriptor(dom.window, key));
}
const $ = require("jquery");
const library = require("jquery-star");
library.installStar($);
if (typeof $.fn.star !== "function" || typeof $.star.nextUpdate !== "function") throw new Error("CommonJS installation failed");
if (library.STAR_PLUGIN_API_VERSION !== "0.1.0") throw new Error("CommonJS plugin API version export failed");
document.body.innerHTML = '<section id="extension-root"><output data-proof.commonjs:label="proof.commonjs.upper(&quot;ready&quot;)"></output></section>';
let extensionCleanups = 0;
let middlewareCalls = 0;
const pluginFacade = $.star.use({ name: "proof.commonjs", version: "1.0.0", apiVersion: "^0.1.0", install(registrar) {
  registrar.action("proof.commonjs.run", () => {});
  registrar.requestMiddleware({ id: "short", handle(request, next, context) { if (new URL(request.url).pathname !== "/middleware") return next(); middlewareCalls += 1; return context.complete(); } });
  registrar.helper("proof.commonjs.upper", (value) => String(value).toUpperCase());
  registrar.directive({ id: "proof.commonjs.label", match: { name: "data-proof.commonjs:label" }, mount({ attribute, context, effect, expressions, $element }) {
    const evaluate = expressions.compileValue(attribute.value, { attribute: attribute.name });
    effect(() => $element.text(String(evaluate(context))));
    return () => { extensionCleanups += 1; };
  } });
  return { ready: true };
} });
if (pluginFacade.ready !== true) throw new Error("CommonJS plugin facade failed");
$.star.boot("#extension-root");
const commonjsInstance = $("#extension-root").star("instance");
const stopKernelOperations = $.star.observeOperations(() => {});
const stopApplicationOperations = commonjsInstance.observeOperations(() => {});
const requestResult = await commonjsInstance.run($.star.get("/middleware"));
if (requestResult !== undefined || middlewareCalls !== 1) throw new Error("CommonJS request middleware failed");
const protocolCalls = [];
globalThis.fetch = async (url, init) => {
  protocolCalls.push([url, init]);
  const result = new URL(url).pathname === "/generic-profile" ? "generic" : "datastar";
  return new Response(JSON.stringify({ profileResult: result }), { headers: { "Content-Type": "application/json" } });
};
let datastarProfileEvents = 0;
$("#extension-root").on("datastar-fetch", () => { datastarProfileEvents += 1; });
await commonjsInstance.run($.star.get("/generic-profile", { profile: "core.generic" }));
await commonjsInstance.run($.star.get("/datastar-profile", { profile: "core.datastar" }));
const [genericURL, genericInit] = protocolCalls[0];
const [datastarURL, datastarInit] = protocolCalls[1];
if (new URL(genericURL).searchParams.has("datastar") || new Headers(genericInit.headers).has("Datastar-Request")) throw new Error("CommonJS generic profile leaked Datastar bytes");
if (!new URL(datastarURL).searchParams.has("datastar") || new Headers(datastarInit.headers).get("Datastar-Request") !== "true") throw new Error("CommonJS Datastar profile bytes failed");
if (commonjsInstance.state.profileResult !== "datastar" || datastarProfileEvents === 0) throw new Error("CommonJS profile response/event contract failed");
stopApplicationOperations();
stopKernelOperations();
if (document.querySelector("output")?.textContent !== "READY") throw new Error("CommonJS directive/helper failed");
$("#extension-root").star("destroy");
if (extensionCleanups !== 1) throw new Error("CommonJS directive cleanup failed");
if (typeof library.StarRequestMiddlewareNextError !== "function" || typeof library.StarRequestMiddlewareValidationError !== "function") throw new Error("CommonJS middleware error exports failed");
if (typeof library.StarProtocolBodyOwnershipError !== "function" || typeof library.StarProtocolSelectionError !== "function" || typeof library.StarProtocolValidationError !== "function") throw new Error("CommonJS protocol error exports failed");
const expressionEngine = library.createTrustedExpressionEngine();
if (typeof expressionEngine.compileStatement !== "function" || typeof expressionEngine.clearCache !== "function") throw new Error("CommonJS expression-engine export failed");
expressionEngine.dispose();
})().catch((error) => { console.error(error); process.exitCode = 1; });
`,
    );
    command("CommonJS consumer", process.execPath, ["commonjs.cjs"], { cwd: consumer });

    await writeFile(
      join(consumer, "core-esm.mjs"),
      `${globals}
const { default: $ } = await import("jquery");
const core = await import("jquery-star/core");
if ($.star !== undefined || $.fn.star !== undefined) throw new Error("Core import installed jQStar");
const installed = core.installStarCore($);
if (installed !== $ || installed.star.version !== "${installedManifest.version}") throw new Error("Core installer identity/version failed");
if (installed.star.ui !== undefined) throw new Error("Core installed UI");
if (typeof core.reactive !== "function" || typeof core.effect !== "function") throw new Error("Core reactivity exports failed");
document.body.innerHTML = '<section id="core-root"><output></output></section>';
$("#core-root").star({ state: { count: 1 }, ui: { output: { text: ({ state }) => state.count } } });
const instance = $("#core-root").star("instance");
if (document.querySelector("output")?.textContent !== "1") throw new Error("Core application failed");
let request;
globalThis.fetch = async (url, init) => { request = [url, init]; return new Response('{"count":7}', { headers: { "Content-Type": "application/json" } }); };
await instance.run(installed.star.get("/generic-default"));
const [requestURL, requestInit] = request;
if (new URL(requestURL).searchParams.has("datastar")) throw new Error("Core generic request leaked Datastar query state");
const requestHeaders = new Headers(requestInit.headers);
if (requestHeaders.has("Datastar-Request") || requestHeaders.get("Accept")?.includes("text/event-stream")) throw new Error("Core generic request leaked Datastar headers");
if (instance.state.count !== 7) throw new Error("Core generic response failed");
await instance.run(installed.star.get("/missing-datastar", { profile: "core.datastar" })).then(
  () => { throw new Error("Core unexpectedly provided Datastar"); },
  (error) => { if (!String(error).includes("Unknown protocol profile: core.datastar")) throw error; },
);
const renderAdapter = core.createRenderAdapter(installed);
const renderTransaction = renderAdapter.begin(document.body);
const outgoingRoot = document.querySelector("#core-root");
renderTransaction.beforeRemove(outgoingRoot);
const incomingRoot = document.createElement("section");
incomingRoot.id = "core-incoming";
incomingRoot.dataset.signals = "{ ready: true }";
outgoingRoot.replaceWith(incomingRoot);
await renderTransaction.commit([incomingRoot]);
if (!instance.destroyed || $(incomingRoot).star("instance")?.state.ready !== true) throw new Error("Core render adapter failed");
const disposal = installed.star.dispose();
if (disposal.failed.length !== 0 || disposal.remaining.length !== 0) throw new Error("Core disposal report failed");
`,
    );
    command("core-only ESM consumer", process.execPath, ["core-esm.mjs"], { cwd: consumer });

    await writeFile(
      join(consumer, "modular-esm.mjs"),
      `${globals}
const { default: $ } = await import("jquery");
const core = await import("jquery-star/core");
const uiEntry = await import("jquery-star/ui");
const datastarEntry = await import("jquery-star/datastar");
const turboEntry = await import("jquery-star/turbo");
if ($.star !== undefined || $.fn.star !== undefined) throw new Error("Modular imports installed jQStar");
const installed = core.installStarCore($);
const datastar = installed.star.use(datastarEntry.datastarPlugin);
const ui = installed.star.use(uiEntry.uiPlugin);
const turbo = installed.star.use(turboEntry.createTurboBridge({ $, Turbo: { cache: {}, session: {}, start() {}, visit() {} }, version: "8.0.23" }));
if (datastar.id !== "core.datastar") throw new Error("Datastar plugin facade failed");
if (turbo.host !== "turbo" || turbo.version !== "8.0.23") throw new Error("Turbo plugin facade failed");
if (installed.star.ui !== ui) throw new Error("UI plugin did not attach $.star.ui");
if (uiEntry.uiPlugin.version !== installed.star.version || datastarEntry.datastarPlugin.version !== installed.star.version) throw new Error("Modular versions differ");
if ($.ui !== undefined || $.widget !== undefined) throw new Error("UI plugin claimed jQuery UI");
document.body.innerHTML = '<button id="toggle" data-jqs="toggle">Toggle</button>';
ui.enhance(document);
if (document.querySelector("#toggle")?.getAttribute("aria-pressed") !== "false") throw new Error("UI plugin enhancement failed");
`,
    );
    command("modular ESM consumer", process.execPath, ["modular-esm.mjs"], { cwd: consumer });

    await writeFile(
      join(consumer, "modular-commonjs.cjs"),
      `${globals.replaceAll("await import", "require")}
const $ = require("jquery");
const core = require("jquery-star/core");
const uiEntry = require("jquery-star/ui");
const datastarEntry = require("jquery-star/datastar");
const turboEntry = require("jquery-star/turbo");
if ($.star !== undefined || $.fn.star !== undefined) throw new Error("CommonJS modular imports installed jQStar");
const installed = core.installStarCore($);
const datastar = installed.star.use(datastarEntry.datastarPlugin);
const ui = installed.star.use(uiEntry.uiPlugin);
const turbo = installed.star.use(turboEntry.createTurboBridge({ $, Turbo: { cache: {}, session: {}, start() {}, visit() {} }, version: "8.0.21" }));
if (installed !== $ || datastar.id !== "core.datastar" || installed.star.ui !== ui) throw new Error("CommonJS modular composition failed");
if (turbo.host !== "turbo" || turbo.version !== "8.0.21") throw new Error("CommonJS Turbo plugin facade failed");
if ($.ui !== undefined || $.widget !== undefined) throw new Error("CommonJS UI plugin claimed jQuery UI");
`,
    );
    command("modular CommonJS consumer", process.execPath, ["modular-commonjs.cjs"], {
      cwd: consumer,
    });

    await writeFile(
      join(consumer, "testing-esm.mjs"),
      `${globals}
const { default: $ } = await import("jquery");
const testing = await import("jquery-star/testing");
const datastarTesting = await import("jquery-star/datastar/testing");
const { createCleanupFailingExternalPlugin, createExternalPlugin, createFailingExternalPlugin } = await import("@jqstar-fixtures/external-plugin");
const { createMockNavigationPlugin } = await import("@jqstar-fixtures/mock-navigation-plugin");
if ($.star !== undefined || $.fn.star !== undefined) throw new Error("Testing imports installed jQStar");
const createHarness = () => testing.createStarHarness({ window: dom.window, jQuery: $, responses: testing.createResponseController({ window: dom.window }) });
const coreReport = await testing.runCoreConformance(createHarness);
const pluginReport = await testing.runPluginConformance({ createHarness, plugin: createExternalPlugin(), failingPlugin: createFailingExternalPlugin(), cleanupFailingPlugin: createCleanupFailingExternalPlugin() });
if (coreReport.passed !== 3 || pluginReport.passed !== 3) throw new Error("Installed conformance report failed");
const navigationHarness = createHarness();
const navigation = navigationHarness.install(createMockNavigationPlugin($));
const shell = navigationHarness.document.createElement("main");
shell.innerHTML = '<div id="region"><article id="old"></article><input id="keep" data-jqs-preserve value="old"></div>';
navigationHarness.document.body.append(shell);
const application = navigationHarness.mountBehavior(shell, { state: {} });
const keep = shell.querySelector("#keep");
keep.value = "owned";
await navigation.visit(application.instance, shell.querySelector("#region"), '<input id="keep" data-jqs-preserve value="new"><article id="new" data-jqs></article>');
await navigationHarness.flush();
if (shell.querySelector("#keep") !== keep || keep.value !== "owned" || !shell.querySelector("#new")) throw new Error("Installed navigation fixture failed");
navigationHarness.dispose();
if (datastarTesting.datastarAbortFixture().kind !== "abort") throw new Error("Datastar testing fixture failed");
let testingPrivateBlocked = false;
try { await import("jquery-star/dist/testing.js"); } catch (error) { testingPrivateBlocked = error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"; }
if (!testingPrivateBlocked) throw new Error("A private testing path escaped the export map");
`,
    );
    command("testing ESM consumer", process.execPath, ["testing-esm.mjs"], { cwd: consumer });

    await writeFile(
      join(consumer, "testing-commonjs.cjs"),
      `(async () => {
${globals.replaceAll("await import", "require")}
const $ = require("jquery");
const testing = require("jquery-star/testing");
const datastarTesting = require("jquery-star/datastar/testing");
if ($.star !== undefined || $.fn.star !== undefined) throw new Error("CommonJS testing imports installed jQStar");
const createHarness = () => testing.createStarHarness({ window: dom.window, jQuery: $, responses: testing.createResponseController({ window: dom.window }) });
const report = await testing.runCoreConformance(createHarness);
if (report.passed !== 3 || datastarTesting.datastarAbortFixture().kind !== "abort") throw new Error("CommonJS testing conformance failed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
`,
    );
    command("testing CommonJS consumer", process.execPath, ["testing-commonjs.cjs"], {
      cwd: consumer,
    });

    for (const format of ["js", "cjs"]) {
      command(
        `installed CSP ${format === "js" ? "ESM" : "CommonJS"} corpus conformance`,
        npx,
        [
          "--no-install",
          "vitest",
          "run",
          "test/csp-engine.test.ts",
          "--config",
          "vitest.config.ts",
        ],
        {
          cwd: root,
          env: {
            JQS_CSP_PACKED_ENTRY: join(consumer, "node_modules/jquery-star/dist", `csp.${format}`),
          },
        },
      );
    }

    await writeFile(
      join(consumer, "consumer.mts"),
      `import $ from "jquery";
import {
  STAR_PLUGIN_API_VERSION,
  StarProtocolBodyOwnershipError,
  StarProtocolSelectionError,
  StarProtocolValidationError,
  StarRequestMiddlewareNextError,
  StarRequestMiddlewareValidationError,
  createTrustedExpressionEngine,
  installStar,
  nextUpdate,
  type BackendActionOptions,
  type StarExpressionEngine,
  type StarExpressionError,
  type StarExpressionHelperScope,
  type StarExpressionLocation,
  type StarDirective,
  type StarDirectiveAttribute,
  type StarDirectiveCleanup,
  type StarDirectiveContext,
  type StarDirectiveExactMatcher,
  type StarDirectiveMatcher,
  type StarDirectivePrefixMatcher,
  type StarDirectiveTask,
  type StarInstallOptions,
  type StarOperationObservation,
  type StarOperationObserver,
  type StarOperationSubscriptionOptions,
  type StarOperationUnsubscribe,
  type StarParsedDirectiveAttribute,
  type StarPlugin,
  type StarPluginApplicationHook,
  type StarPluginCleanup,
  type StarPluginFacade,
  type StarPluginRegistrar,
  type StarProtocolBodyLease,
  type StarProtocolCompatibilityEvent,
  type StarProtocolEmptyResponseHandler,
  type StarProtocolExactMediaMatcher,
  type StarProtocolFormMetadata,
  type StarProtocolMediaMatcher,
  type StarProtocolProfileDefinition,
  type StarProtocolRequestInput,
  type StarProtocolRequestPreparer,
  type StarProtocolRequestWriter,
  type StarProtocolResponseAdapter,
  type StarProtocolResponseCapabilities,
  type StarProtocolResponseHandler,
  type StarProtocolResponseMetadata,
  type StarProtocolSerializedPayload,
  type StarProtocolStreamConsumer,
  type StarProtocolSuffixMediaMatcher,
  type StarRequestBodyKind,
  type StarRequestBodyMetadata,
  type StarRequestDescriptor,
  type StarRequestMiddleware,
  type StarRequestMiddlewareCancelledOutcome,
  type StarRequestMiddlewareCompletedOutcome,
  type StarRequestMiddlewareContext,
  type StarRequestMiddlewareDefinition,
  type StarRequestMiddlewareFailedOutcome,
  type StarRequestMiddlewareNext,
  type StarRequestMiddlewareOutcome,
  type StarStatementEvaluator,
  type StarStatic,
  type StarValueEvaluator,
} from "jquery-star";
installStar($);
const api: StarStatic = $.star;
const expressionEngine: StarExpressionEngine = createTrustedExpressionEngine();
const expressionLocation: StarExpressionLocation = { attribute: "data-text", line: 1, column: 1 };
const options: StarInstallOptions = { expressionEngine };
const pluginCleanup: StarPluginCleanup = () => undefined;
const applicationHook: StarPluginApplicationHook = () => pluginCleanup;
const operationRecords: StarOperationObservation[] = [];
const operationObserver: StarOperationObserver = (operation) => { operationRecords.push(operation); };
const operationOptions: StarOperationSubscriptionOptions = { kinds: ["action", "request"] };
const stopOperations: StarOperationUnsubscribe = api.observeOperations(operationObserver, operationOptions);
const requestBodyKind: StarRequestBodyKind = "none";
const requestBody: StarRequestBodyMetadata = { kind: requestBodyKind };
const requestDescriptor: StarRequestDescriptor = {
  schema: "jquery-star-request/1",
  operationId: "operation-types",
  method: "GET",
  url: "https://example.test/types",
  headers: [["Datastar-Request", "true"]],
  credentials: "same-origin",
  body: requestBody,
  profile: "core.datastar",
};
const middlewareCompleted: StarRequestMiddlewareCompletedOutcome = { phase: "completed", source: "middleware" };
const middlewareCancelled: StarRequestMiddlewareCancelledOutcome = { phase: "cancelled", source: "middleware", reason: "aborted" };
const middlewareFailed: StarRequestMiddlewareFailedOutcome = { phase: "failed", source: "middleware", error: { name: "Error", message: "failed" } };
const middlewareOutcome: StarRequestMiddlewareOutcome = middlewareCompleted;
const middlewareNext: StarRequestMiddlewareNext = async () => middlewareOutcome;
const middlewareContext: StarRequestMiddlewareContext = {
  id: "proof.types.short",
  signal: new AbortController().signal,
  complete: () => middlewareCompleted,
  cancel: () => middlewareCancelled,
};
const middleware: StarRequestMiddleware = async (request, next, context) => {
  void [request.body, context.id];
  return next(request);
};
const middlewareDefinition: StarRequestMiddlewareDefinition = {
  id: "short",
  handle: middleware,
};
const middlewareNextError = new StarRequestMiddlewareNextError("next failed");
const middlewareValidationError = new StarRequestMiddlewareValidationError("invalid request");
const protocolBodyError = new StarProtocolBodyOwnershipError("body claimed");
const protocolSelectionError = new StarProtocolSelectionError("profile missing");
const protocolValidationError = new StarProtocolValidationError("profile invalid");
const protocolEvent: StarProtocolCompatibilityEvent = "jquery-star:fetch";
const protocolPayload: StarProtocolSerializedPayload = { explicit: true, json: "{}" };
const protocolForm: StarProtocolFormMetadata = { encoding: "urlencoded" };
const protocolInput: StarProtocolRequestInput = {
  schema: "jquery-star-protocol-request/1",
  profile: "proof.types.text",
  operationId: "operation-types",
  method: "GET",
  url: "https://example.test/types",
  headers: [],
  credentials: "same-origin",
  params: [],
  payload: protocolPayload,
  signalsJSON: "{}",
  form: protocolForm,
};
const protocolWriter: StarProtocolRequestWriter = {
  query: () => undefined,
  setHeader: () => undefined,
  deleteHeader: () => undefined,
  none: () => undefined,
  json: () => undefined,
  form: () => undefined,
};
const protocolPreparer: StarProtocolRequestPreparer = (input, writer) => {
  void input.schema;
  writer.none();
};
const protocolExact: StarProtocolExactMediaMatcher = { kind: "exact", mediaType: "text/plain" };
const protocolSuffix: StarProtocolSuffixMediaMatcher = { kind: "suffix", suffix: "+json" };
const protocolMatcher: StarProtocolMediaMatcher = protocolExact;
const protocolMetadata: StarProtocolResponseMetadata = {
  schema: "jquery-star-protocol-response/1",
  profile: "proof.types.text",
  status: 200,
  statusText: "OK",
  url: "https://example.test/types",
  redirected: false,
  headers: [["content-type", "text/plain"]],
  mediaType: "text/plain",
};
const protocolStreamConsumer: StarProtocolStreamConsumer = async (chunk) => { void chunk.byteLength; };
const protocolBody: StarProtocolBodyLease = {
  claimed: false,
  signal: new AbortController().signal,
  text: async () => "proof",
  stream: async (consume) => { await consume(new Uint8Array()); },
};
const protocolCapabilities: StarProtocolResponseCapabilities = {
  request: requestDescriptor,
  signal: protocolBody.signal,
  patchSignals: () => undefined,
  patchElements: () => undefined,
  emitSSE: () => undefined,
};
const protocolHandler: StarProtocolResponseHandler = async (metadata, body, capabilities) => {
  void [metadata.mediaType, capabilities.request.profile];
  await body.text();
};
const protocolEmpty: StarProtocolEmptyResponseHandler = (metadata) => { void metadata.status; };
const protocolAdapter: StarProtocolResponseAdapter = {
  id: "text",
  match: protocolMatcher,
  handle: protocolHandler,
};
const protocolProfile: StarProtocolProfileDefinition = {
  id: "proof.types.text",
  compatibilityEvents: [protocolEvent],
  prepareRequest: protocolPreparer,
  adapters: [protocolAdapter],
  empty: protocolEmpty,
};
const backendOptions: BackendActionOptions = { profile: "core.generic" };
const directiveCleanup: StarDirectiveCleanup = () => undefined;
const directiveTask: StarDirectiveTask = async (signal) => { void signal.aborted; };
const exactMatcher: StarDirectiveExactMatcher = { name: "data-proof.types:label" };
const prefixMatcher: StarDirectivePrefixMatcher = { prefix: "data-proof.types:group:" };
const directiveMatcher: StarDirectiveMatcher = exactMatcher;
const directiveAttribute: StarDirectiveAttribute = { name: exactMatcher.name, suffix: "", value: "1" };
const parsedDirectiveAttribute: StarParsedDirectiveAttribute<number> = { ...directiveAttribute, parsed: 1 };
const helperScope: StarExpressionHelperScope = { proof: { types: { double: (value: number) => value * 2 } } };
const directive: StarDirective<number> = {
  id: "proof.types.label",
  match: exactMatcher,
  parse: ({ value }) => Number(value),
  mount(context: StarDirectiveContext<number>) {
    context.cleanup(directiveCleanup);
    context.task(directiveTask);
    void [context.attribute.parsed, context.helpers, context.expressions, context.application];
  },
};
const plugin: StarPlugin<{ readonly ready: true }> = {
  name: "proof.types",
  version: "1.0.0",
  apiVersion: "^" + STAR_PLUGIN_API_VERSION,
  install(registrar: StarPluginRegistrar) {
    registrar.application(applicationHook);
    registrar.cleanup(pluginCleanup);
    registrar.action("proof.types.run", () => undefined);
    registrar.helper("proof.types.double", (value: number) => value * 2);
    registrar.directive(directive);
    registrar.observeOperations(operationObserver, operationOptions);
    registrar.protocolProfile(protocolProfile);
    registrar.requestMiddleware(middlewareDefinition);
    return { ready: true };
  },
};
const facade: StarPluginFacade<typeof plugin> = api.use(plugin);
const value: StarValueEvaluator = expressionEngine.compileValue("1", expressionLocation);
const statement: StarStatementEvaluator = expressionEngine.compileStatement("return 1", expressionLocation);
const failure = undefined as StarExpressionError | undefined;
stopOperations();
void [api, options, facade, value, statement, failure, prefixMatcher, directiveMatcher, parsedDirectiveAttribute, helperScope, operationRecords, requestDescriptor, middlewareFailed, middlewareNext, middlewareContext, middlewareNextError, middlewareValidationError, protocolBodyError, protocolSelectionError, protocolValidationError, protocolInput, protocolWriter, protocolSuffix, protocolMetadata, protocolStreamConsumer, protocolBody, protocolCapabilities, backendOptions];
expressionEngine.dispose();
await nextUpdate();
`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      const configuration = {
        compilerOptions: {
          lib: ["DOM", "ES2022"],
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        files: ["consumer.mts"],
      };
      const path = `tsconfig.${resolution.toLowerCase()}.json`;
      await writeFile(join(consumer, path), `${JSON.stringify(configuration, null, 2)}\n`);
      command(`TypeScript ${resolution}`, npx, ["--no-install", "tsc", "-p", path], {
        cwd: consumer,
      });
    }
    await writeFile(
      join(consumer, "modular-consumer.mts"),
      `import $ from "jquery";
import { createRenderAdapter, installStarCore, type StarCoreStatic, type StarInstalledJQuery, type StarRenderAdapter, type StarRenderTransaction } from "jquery-star/core";
import { uiPlugin, type StarUIStatic } from "jquery-star/ui";
import { datastarPlugin } from "jquery-star/datastar";
import { createTurboBridge, type StarTurboBridge, type StarTurboCapability } from "jquery-star/turbo";
type ArbitraryJQueryHasStar = JQueryStatic extends { star: unknown } ? true : false;
const arbitraryJQueryHasStar: ArbitraryJQueryHasStar = false;
const installed: StarInstalledJQuery = installStarCore($);
const core: StarCoreStatic = installed.star;
const renderAdapter: StarRenderAdapter = createRenderAdapter(installed);
const renderTransaction: StarRenderTransaction = renderAdapter.begin(document.documentElement);
const datastar = core.use(datastarPlugin);
const ui: StarUIStatic = core.use(uiPlugin);
const Turbo: StarTurboCapability = { cache: {}, session: {}, start() {}, visit() {} };
const turbo: StarTurboBridge = core.use(createTurboBridge({ $, Turbo, version: "8.0.23" }));
void [arbitraryJQueryHasStar, datastar.id, ui.enhance, turbo.observations, core.version, renderTransaction.operationId];
`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      const configuration = {
        compilerOptions: {
          lib: ["DOM", "ES2022"],
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        files: ["modular-consumer.mts"],
      };
      const configurationFile = `tsconfig.modular-${resolution.toLowerCase()}.json`;
      await writeFile(
        join(consumer, configurationFile),
        `${JSON.stringify(configuration, null, 2)}\n`,
      );
      command(
        `TypeScript modular ${resolution}`,
        npx,
        ["--no-install", "tsc", "-p", configurationFile],
        { cwd: consumer },
      );
    }
    await writeFile(
      join(consumer, "testing-consumer.mts"),
      `import $ from "jquery";
import {
  StarConformanceError,
  StarFlushError,
  StarResponseError,
  createResponseController,
  createStarHarness,
  runCoreConformance,
  type CreateStarHarnessOptions,
  type StarConformanceReport,
  type StarDOMWindow,
  type StarFlushDiagnostic,
  type StarHarness,
  type StarResponseController,
} from "jquery-star/testing";
import {
  datastarAbortFixture,
  datastarMultiEventFixture,
  type StarDatastarFixtureEvent,
} from "jquery-star/datastar/testing";
const responseController: StarResponseController = createResponseController();
const options: CreateStarHarnessOptions = { window: window as StarDOMWindow, jQuery: $, responses: responseController };
const harness: StarHarness = createStarHarness(options);
const report: Promise<StarConformanceReport> = runCoreConformance(() => harness);
const events: readonly StarDatastarFixtureEvent[] = [{ kind: "signals", signals: { ready: true } }];
const diagnostic = undefined as StarFlushDiagnostic | undefined;
void [report, events, diagnostic, datastarAbortFixture(), datastarMultiEventFixture(events), StarConformanceError, StarFlushError, StarResponseError];
`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      const configuration = {
        compilerOptions: {
          lib: ["DOM", "ES2022"],
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        files: ["testing-consumer.mts"],
      };
      const configurationFile = `tsconfig.testing-${resolution.toLowerCase()}.json`;
      await writeFile(
        join(consumer, configurationFile),
        `${JSON.stringify(configuration, null, 2)}\n`,
      );
      command(
        `TypeScript testing ${resolution}`,
        npx,
        ["--no-install", "tsc", "-p", configurationFile],
        {
          cwd: consumer,
        },
      );
    }
    await writeFile(
      join(consumer, "csp-consumer.mts"),
      `import $ from "jquery";
import {
  CSP_CONTRACT_DIGEST,
  CSP_GRAMMAR_VERSION,
  createCSPExpressionEngine,
  installStarCSP,
  isStarCSPExpressionError,
  type CSPDiagnosticCode,
  type StarCSPExpressionError,
  type StarCSPInstallOptions,
  type StarExpressionEngine,
} from "jquery-star/csp";
const options: StarCSPInstallOptions = { document };
const installed = installStarCSP($, options);
const engine: StarExpressionEngine = createCSPExpressionEngine();
const code: CSPDiagnosticCode = "CSP_CAPABILITY_IDENTIFIER";
let failure: StarCSPExpressionError | undefined;
try { engine.compileValue("globalThis"); } catch (error) { if (isStarCSPExpressionError(error)) failure = error; }
void [installed.star.version, CSP_GRAMMAR_VERSION, CSP_CONTRACT_DIGEST, code, failure];
engine.dispose();
installed.star.dispose();
`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      const configuration = {
        compilerOptions: {
          lib: ["DOM", "ES2022"],
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        files: ["csp-consumer.mts"],
      };
      const configurationFile = `tsconfig.csp-${resolution.toLowerCase()}.json`;
      await writeFile(
        join(consumer, configurationFile),
        `${JSON.stringify(configuration, null, 2)}\n`,
      );
      command(
        `TypeScript CSP ${resolution}`,
        npx,
        ["--no-install", "tsc", "-p", configurationFile],
        {
          cwd: consumer,
        },
      );
    }
    return {
      consumers: [
        "esm",
        "commonjs",
        "core-only-esm",
        "modular-esm",
        "modular-commonjs",
        "testing-esm",
        "testing-commonjs",
        "csp-esm-corpus",
        "csp-commonjs-corpus",
        "private-path",
        "typescript-nodenext",
        "typescript-bundler",
        "typescript-modular-nodenext",
        "typescript-modular-bundler",
        "typescript-testing-nodenext",
        "typescript-testing-bundler",
        "typescript-csp-nodenext",
        "typescript-csp-bundler",
      ],
      peerDependencies: {
        jqueryRange: jqueryPeer,
        turboRange: turboPeer,
        turboOptional: true,
        missing: missingPeerEvidence,
        incompatible: incompatiblePeerEvidence,
      },
    };
  });

  await record("qunit-consumer", async () => {
    await writeFile(
      join(consumer, "qunit.cjs"),
      `const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
globalThis.window = dom.window;
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) Object.defineProperty(globalThis, key, Object.getOwnPropertyDescriptor(dom.window, key));
}
const QUnit = require("qunit");
QUnit.config.autostart = false;
QUnit.test("installed CommonJS package is runner neutral", async (assert) => {
  const library = require("jquery-star");
  const $ = require("jquery");
  assert.strictEqual(typeof library.installStar, "function");
  assert.strictEqual(typeof library.nextUpdate, "function");
  assert.strictEqual(typeof library.createTrustedExpressionEngine, "function");
  assert.strictEqual(library.STAR_PLUGIN_API_VERSION, "0.1.0");
  document.body.innerHTML = '<section id="extension-root"><output data-proof.qunit:label="proof.qunit.upper(&quot;ready&quot;)"></output></section>';
  let cleanups = 0;
  let middlewareCalls = 0;
  const kernelOperations = [];
  const pluginOperations = [];
  const stopKernelOperations = $.star.observeOperations((operation) => kernelOperations.push(operation));
  const facade = $.star.use({ name: "proof.qunit", version: "1.0.0", apiVersion: "^0.1.0", install(registrar) {
    registrar.action("proof.qunit.run", () => undefined);
    registrar.requestMiddleware({ id: "short", handle(request, next, context) { if (new URL(request.url).pathname !== "/middleware") return next(); middlewareCalls += 1; return context.complete(); } });
    registrar.observeOperations((operation) => pluginOperations.push(operation));
    registrar.helper("proof.qunit.upper", (value) => String(value).toUpperCase());
    registrar.directive({ id: "proof.qunit.label", match: { name: "data-proof.qunit:label" }, mount({ attribute, context, expressions, $element }) {
      $element.text(String(expressions.compileValue(attribute.value)(context)));
      return () => { cleanups += 1; };
    } });
    return { ready: true };
  } });
  assert.true(facade.ready);
  $.star.boot("#extension-root");
  const instance = $("#extension-root").star("instance");
  const applicationOperations = [];
  const stopApplicationOperations = instance.observeOperations((operation) => applicationOperations.push(operation));
  await instance.run("proof.qunit.run");
  assert.deepEqual(kernelOperations.map(({ phase }) => phase), ["started", "completed"]);
  assert.deepEqual(applicationOperations.map(({ phase }) => phase), ["started", "completed"]);
  assert.deepEqual(pluginOperations.map(({ phase }) => phase), ["started", "completed"]);
  const requestResult = await instance.run($.star.get("/middleware"));
  assert.strictEqual(requestResult, undefined);
  assert.strictEqual(middlewareCalls, 1);
  const protocolCalls = [];
  globalThis.fetch = async (url, init) => {
    protocolCalls.push([url, init]);
    const result = new URL(url).pathname === "/generic-profile" ? "generic" : "datastar";
    return new Response(JSON.stringify({ profileResult: result }), { headers: { "Content-Type": "application/json" } });
  };
  let datastarProfileEvents = 0;
  $("#extension-root").on("datastar-fetch", () => { datastarProfileEvents += 1; });
  await instance.run($.star.get("/generic-profile", { profile: "core.generic" }));
  await instance.run($.star.get("/datastar-profile", { profile: "core.datastar" }));
  const [genericURL, genericInit] = protocolCalls[0];
  const [datastarURL, datastarInit] = protocolCalls[1];
  assert.false(new URL(genericURL).searchParams.has("datastar"));
  assert.strictEqual(new Headers(genericInit.headers).get("Datastar-Request"), null);
  assert.true(new URL(datastarURL).searchParams.has("datastar"));
  assert.strictEqual(new Headers(datastarInit.headers).get("Datastar-Request"), "true");
  assert.strictEqual(instance.state.profileResult, "datastar");
  assert.true(datastarProfileEvents > 0);
  assert.strictEqual(typeof library.StarRequestMiddlewareNextError, "function");
  assert.strictEqual(typeof library.StarRequestMiddlewareValidationError, "function");
  assert.strictEqual(typeof library.StarProtocolBodyOwnershipError, "function");
  assert.strictEqual(typeof library.StarProtocolSelectionError, "function");
  assert.strictEqual(typeof library.StarProtocolValidationError, "function");
  stopApplicationOperations();
  stopKernelOperations();
  assert.strictEqual(document.querySelector("output").textContent, "READY");
  $("#extension-root").star("destroy");
  assert.strictEqual(cleanups, 1);
  $.star.dispose();
});
QUnit.test("installed testing conformance stays runner neutral", async (assert) => {
  const $ = require("jquery");
  const testing = require("jquery-star/testing");
  const { createCleanupFailingExternalPlugin, createExternalPlugin, createFailingExternalPlugin } = await import("@jqstar-fixtures/external-plugin");
  const createHarness = () => testing.createStarHarness({ window: dom.window, jQuery: $, responses: testing.createResponseController({ window: dom.window }) });
  const core = await testing.runCoreConformance(createHarness);
  const plugin = await testing.runPluginConformance({ createHarness, plugin: createExternalPlugin(), failingPlugin: createFailingExternalPlugin(), cleanupFailingPlugin: createCleanupFailingExternalPlugin() });
  assert.strictEqual(core.passed, 3);
  assert.strictEqual(plugin.passed, 3);
});
QUnit.test("installed CSP entry stays explicit", async (assert) => {
  const $ = require("jquery");
  const csp = require("jquery-star/csp");
  assert.strictEqual($.star, undefined);
  assert.strictEqual(csp.CSP_GRAMMAR_VERSION, "jqstar-csp-expression/1");
  document.body.innerHTML = '<main id="csp-qunit" data-signals="{ count: 2 }"><button data-on:click="$count++">Increment</button><output data-text="$count"></output></main>';
  const installed = csp.installStarCSP($);
  installed.star.boot("#csp-qunit");
  $("#csp-qunit button").trigger("click");
  await installed.star.nextUpdate();
  assert.strictEqual($("#csp-qunit output").text(), "3");
  installed.star.dispose();
});
QUnit.on("runEnd", ({ testCounts }) => { if (testCounts.failed) process.exitCode = 1; });
QUnit.start();
`,
    );
    command("QUnit installed consumer", process.execPath, ["qunit.cjs"], { cwd: consumer });
    return "3 installed-package extension, testing, and CSP tests";
  });

  await record("browser-consumers", async () => {
    const installedPackage = join(consumer, "node_modules", "jquery-star");
    const graph = await inspectCSPGraphs(root, join(installedPackage, "dist"));
    const graphViolations = [
      ...graph.source.violations,
      ...graph.formats.esm.violations,
      ...graph.formats.commonjs.violations,
    ];
    assert(graph.forbiddenModules.length === 0, "CSP graph contains the trusted compiler.");
    assert(
      graphViolations.length === 0,
      `CSP graph contains dynamic-code constructs: ${JSON.stringify(graphViolations)}.`,
    );
    const installedManifest = JSON.parse(
      await readFile(join(installedPackage, "package.json"), "utf8"),
    );
    return serveBrowserProof(installedPackage, consumer, {
      corpusDigest: "2726c0377afac773700d0ec2334a0cb88bc246e67ad80b63b583ff5a5e5d349f",
      grammarVersion: "jqstar-csp-expression/1",
      graph,
      packageVersion: installedManifest.version,
      tarballDigest: createHash("sha256")
        .update(await readFile(tarball))
        .digest("hex"),
    });
  });

  await record("bundle-sentinel", async () => {
    assert(budgets, "Package budgets are unavailable.");
    const bundle = join(consumer, "bundle");
    await mkdir(join(bundle, "src"), { recursive: true });
    await writeFile(
      join(bundle, "index.html"),
      '<script type="module" src="/src/main.js"></script>\n',
    );
    await writeFile(
      join(bundle, "src/main.js"),
      'import { nextUpdate } from "jquery-star"; window.__jqstarBundleProof = nextUpdate;\n',
    );
    command("Vite installed consumer", npx, ["--no-install", "vite", "build", "--outDir", "dist"], {
      cwd: bundle,
    });
    const files = await readdir(join(bundle, "dist/assets"));
    const path = files.find((file) => file.endsWith(".js"));
    assert(path, "Vite produced an empty JavaScript asset selection.");
    const bytes = (await stat(join(bundle, "dist/assets", path))).size;
    assert(bytes > 0, "Vite bundle is empty.");
    assert(
      bytes <= budgets.consumerBundles.rootImportBytes,
      `Installed root bundle is ${bytes} bytes; budget is ${budgets.consumerBundles.rootImportBytes}.`,
    );
    const bundledSource = await readFile(join(bundle, "dist/assets", path), "utf8");
    for (const forbidden of [
      "Self-hosting operations console",
      "better-sqlite",
      "jqstar source registry",
      "jqstar-csp-expression/1",
    ]) {
      assert(!bundledSource.includes(forbidden), `Installed root bundle contains ${forbidden}.`);
    }
    const coreBundle = join(consumer, "core-bundle");
    await mkdir(join(coreBundle, "src"), { recursive: true });
    await writeFile(
      join(coreBundle, "index.html"),
      '<script type="module" src="/src/main.js"></script>\n',
    );
    await writeFile(
      join(coreBundle, "src/main.js"),
      'import $ from "jquery"; import { createRenderAdapter, installStarCore } from "jquery-star/core"; window.__jqstarCoreProof = () => { const installed = installStarCore($); return [installed, createRenderAdapter(installed)]; };\n',
    );
    await writeFile(
      join(coreBundle, "vite.config.mjs"),
      `import { writeFileSync } from "node:fs";
export default { plugins: [{ name: "jqstar-module-graph", generateBundle(_options, bundle) {
  const modules = Object.values(bundle).filter((entry) => entry.type === "chunk").flatMap((entry) => Object.keys(entry.modules));
  writeFileSync(new URL("./module-graph.json", import.meta.url), JSON.stringify(modules, null, 2));
} }] };
`,
    );
    command(
      "Vite installed core consumer",
      npx,
      ["--no-install", "vite", "build", "--outDir", "dist"],
      { cwd: coreBundle },
    );
    const coreFiles = await readdir(join(coreBundle, "dist/assets"));
    const corePath = coreFiles.find((file) => file.endsWith(".js"));
    assert(corePath, "Vite produced an empty core JavaScript asset selection.");
    const coreSource = await readFile(join(coreBundle, "dist/assets", corePath));
    const coreBytes = coreSource.byteLength;
    const coreGzipBytes = gzipSync(coreSource).byteLength;
    assert(
      coreBytes <= budgets.consumerBundles.coreImportBytes,
      `Installed core bundle is ${coreBytes} bytes; budget is ${budgets.consumerBundles.coreImportBytes}.`,
    );
    assert(
      coreGzipBytes <= budgets.consumerBundles.coreImportGzipBytes,
      `Installed core gzip bundle is ${coreGzipBytes} bytes; budget is ${budgets.consumerBundles.coreImportGzipBytes}.`,
    );
    const coreModules = JSON.parse(await readFile(join(coreBundle, "module-graph.json"), "utf8"));
    for (const forbidden of [
      "/dist/ui.js",
      "/dist/datastar.js",
      "/dist/datastar-",
      "/dist/testing.js",
      "/dist/testing-",
      "/dist/turbo.js",
      "/dist/turbo-",
      "/dist/csp.js",
      "/dist/csp-",
      "/registry/",
      "/server-dist/",
    ]) {
      assert(
        !coreModules.some((moduleId) => moduleId.includes(forbidden)),
        `Installed core graph contains ${forbidden}.`,
      );
    }
    const buildOptionalGraph = async (name, source) => {
      const project = join(consumer, `${name}-bundle`);
      await mkdir(join(project, "src"), { recursive: true });
      await writeFile(
        join(project, "index.html"),
        '<script type="module" src="/src/main.js"></script>\n',
      );
      await writeFile(join(project, "src/main.js"), source);
      await writeFile(
        join(project, "vite.config.mjs"),
        `import { writeFileSync } from "node:fs";
export default { build: { modulePreload: { polyfill: false }, rollupOptions: { external: ${name === "csp" ? '["jquery"]' : "[]"} } }, plugins: [{ name: "jqstar-${name}-graph", generateBundle(_options, bundle) {
  const modules = Object.values(bundle).filter((entry) => entry.type === "chunk").flatMap((entry) => Object.keys(entry.modules));
  writeFileSync(new URL("./module-graph.json", import.meta.url), JSON.stringify(modules, null, 2));
} }] };
`,
      );
      command(
        `Vite installed ${name} consumer`,
        npx,
        ["--no-install", "vite", "build", "--outDir", "dist"],
        { cwd: project },
      );
      const assets = await readdir(join(project, "dist/assets"));
      const asset = assets.find((file) => file.endsWith(".js"));
      assert(asset, `Vite produced no ${name} JavaScript asset.`);
      const bytes = await readFile(join(project, "dist/assets", asset));
      return {
        bytes: bytes.byteLength,
        brotliBytes: brotliCompressSync(bytes).byteLength,
        gzipBytes: gzipSync(bytes).byteLength,
        modules: JSON.parse(await readFile(join(project, "module-graph.json"), "utf8")),
        source: bytes.toString("utf8"),
      };
    };
    const testingBundle = await buildOptionalGraph(
      "testing",
      'import $ from "jquery"; import { createResponseController, createStarHarness } from "jquery-star/testing"; window.__testing = () => createStarHarness({ window, jQuery: $, responses: createResponseController({ window }) });\n',
    );
    assert(
      testingBundle.bytes <= budgets.consumerBundles.testingImportBytes,
      `Installed testing bundle is ${testingBundle.bytes} bytes; budget is ${budgets.consumerBundles.testingImportBytes}.`,
    );
    assert(
      testingBundle.gzipBytes <= budgets.consumerBundles.testingImportGzipBytes,
      `Installed testing gzip bundle is ${testingBundle.gzipBytes} bytes; budget is ${budgets.consumerBundles.testingImportGzipBytes}.`,
    );
    for (const forbidden of [
      "node_modules/jsdom",
      "node_modules/qunit",
      "node_modules/vitest",
      "node_modules/@playwright",
      "node_modules/@starfederation/datastar-sdk",
      "/dist/datastar-testing",
      "/dist/turbo",
      "/dist/csp",
    ]) {
      assert(
        !testingBundle.modules.some((moduleId) => moduleId.includes(forbidden)),
        `Installed testing graph contains ${forbidden}.`,
      );
    }
    const datastarTestingBundle = await buildOptionalGraph(
      "datastar-testing",
      'import { datastarSuccessFixture } from "jquery-star/datastar/testing"; window.__datastarTesting = datastarSuccessFixture;\n',
    );
    assert(
      datastarTestingBundle.bytes <= budgets.consumerBundles.datastarTestingImportBytes,
      `Installed Datastar testing bundle is ${datastarTestingBundle.bytes} bytes; budget is ${budgets.consumerBundles.datastarTestingImportBytes}.`,
    );
    assert(
      datastarTestingBundle.gzipBytes <= budgets.consumerBundles.datastarTestingImportGzipBytes,
      `Installed Datastar testing gzip bundle is ${datastarTestingBundle.gzipBytes} bytes; budget is ${budgets.consumerBundles.datastarTestingImportGzipBytes}.`,
    );
    for (const forbidden of [
      "node_modules/jsdom",
      "node_modules/qunit",
      "node_modules/vitest",
      "node_modules/@playwright",
      "/dist/csp",
      "/dist/turbo",
    ]) {
      assert(
        !datastarTestingBundle.modules.some((moduleId) => moduleId.includes(forbidden)),
        `Installed Datastar testing graph contains ${forbidden}.`,
      );
    }
    const cspBundle = await buildOptionalGraph(
      "csp",
      'import $ from "jquery"; import { CSP_GRAMMAR_VERSION, installStarCSP } from "jquery-star/csp"; window.__csp = () => [installStarCSP($), CSP_GRAMMAR_VERSION];\n',
    );
    assert(
      cspBundle.bytes <= budgets.consumerBundles.cspImportBytes,
      `Installed CSP bundle is ${cspBundle.bytes} bytes; budget is ${budgets.consumerBundles.cspImportBytes}.`,
    );
    assert(
      cspBundle.gzipBytes <= budgets.consumerBundles.cspImportGzipBytes,
      `Installed CSP gzip bundle is ${cspBundle.gzipBytes} bytes; budget is ${budgets.consumerBundles.cspImportGzipBytes}.`,
    );
    assert(
      cspBundle.brotliBytes <= budgets.consumerBundles.cspImportBrotliBytes,
      `Installed CSP Brotli bundle is ${cspBundle.brotliBytes} bytes; budget is ${budgets.consumerBundles.cspImportBrotliBytes}.`,
    );
    for (const forbidden of [
      "/dist/jquery-star.js",
      "/dist/core.js",
      "/dist/render-adapter-",
      "/dist/ui.js",
      "/dist/datastar.js",
      "/dist/testing.js",
      "/dist/turbo.js",
    ]) {
      assert(
        !cspBundle.modules.some((moduleId) => moduleId.includes(forbidden)),
        `Installed CSP graph contains ${forbidden}.`,
      );
    }
    const cspBundleViolations = cspCodeViolations(cspBundle.source, "installed-csp-bundle.js");
    assert(
      cspBundleViolations.length === 0,
      `Installed CSP bundle contains dynamic-code constructs: ${JSON.stringify(cspBundleViolations)}.`,
    );
    const turboBundle = await buildOptionalGraph(
      "turbo",
      'import $ from "jquery"; import { installStarCore } from "jquery-star/core"; import { createTurboBridge } from "jquery-star/turbo"; window.__turbo = () => { const installed = installStarCore($); return installed.star.use(createTurboBridge({ $, Turbo: { cache: {}, session: {}, start() {}, visit() {} }, version: "8.0.23" })); };\n',
    );
    assert(
      turboBundle.bytes <= budgets.consumerBundles.turboImportBytes,
      `Installed Turbo bundle is ${turboBundle.bytes} bytes; budget is ${budgets.consumerBundles.turboImportBytes}.`,
    );
    assert(
      turboBundle.gzipBytes <= budgets.consumerBundles.turboImportGzipBytes,
      `Installed Turbo gzip bundle is ${turboBundle.gzipBytes} bytes; budget is ${budgets.consumerBundles.turboImportGzipBytes}.`,
    );
    for (const forbidden of [
      "node_modules/@hotwired/turbo",
      "/dist/ui",
      "/dist/datastar",
      "/dist/testing",
      "/dist/csp",
    ]) {
      assert(
        !turboBundle.modules.some((moduleId) => moduleId.includes(forbidden)),
        `Installed Turbo graph contains ${forbidden}.`,
      );
    }
    return {
      root: { bytes, budget: budgets.consumerBundles.rootImportBytes },
      core: {
        bytes: coreBytes,
        budget: budgets.consumerBundles.coreImportBytes,
        gzipBytes: coreGzipBytes,
        gzipBudget: budgets.consumerBundles.coreImportGzipBytes,
        modules: coreModules.length,
        forbiddenOptionalModules: "absent",
      },
      csp: {
        bytes: cspBundle.bytes,
        budget: budgets.consumerBundles.cspImportBytes,
        brotliBytes: cspBundle.brotliBytes,
        brotliBudget: budgets.consumerBundles.cspImportBrotliBytes,
        gzipBytes: cspBundle.gzipBytes,
        gzipBudget: budgets.consumerBundles.cspImportGzipBytes,
        modules: cspBundle.modules.length,
        trustedCompiler: "absent",
        dynamicCode: "absent",
      },
      testing: {
        bytes: testingBundle.bytes,
        budget: budgets.consumerBundles.testingImportBytes,
        gzipBytes: testingBundle.gzipBytes,
        gzipBudget: budgets.consumerBundles.testingImportGzipBytes,
        modules: testingBundle.modules.length,
        datastarSDK: "absent",
        externalDOMAndRunners: "absent",
      },
      datastarTesting: {
        bytes: datastarTestingBundle.bytes,
        budget: budgets.consumerBundles.datastarTestingImportBytes,
        gzipBytes: datastarTestingBundle.gzipBytes,
        gzipBudget: budgets.consumerBundles.datastarTestingImportGzipBytes,
        modules: datastarTestingBundle.modules.length,
        externalDOMAndRunners: "absent",
      },
      turbo: {
        bytes: turboBundle.bytes,
        budget: budgets.consumerBundles.turboImportBytes,
        gzipBytes: turboBundle.gzipBytes,
        gzipBudget: budgets.consumerBundles.turboImportGzipBytes,
        modules: turboBundle.modules.length,
        hostPackage: "absent",
      },
    };
  });

  await record("copy-in-registry", async () => {
    const project = join(consumer, "copy-in");
    await mkdir(project, { recursive: true });
    const cli = join(consumer, "node_modules/jquery-star/bin/jqstar.mjs");
    command("registry init", process.execPath, [cli, "init", "--cwd", project]);
    command("registry add", process.execPath, [cli, "add", "button", "--cwd", project]);
    const configuration = JSON.parse(await readFile(join(project, "jquery-star.json"), "utf8"));
    const copied = join(project, configuration.output, "button.html");
    await access(copied);
    return copied.slice(project.length + 1);
  });

  assertExactCheckSet(report.checks, packageCheckNames);
  report.status = reportStatus(report.checks);
  await writeReport();
  if (report.status !== "pass") {
    const failures = report.checks
      .filter((check) => check.status !== "pass")
      .map((check) => `${check.name}: ${check.detail}`)
      .join("\n");
    process.stderr.write(`Package quality failed. Evidence: ${output}\n${failures}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `package quality: ${report.checks.length} checks passed for ${basename(tarball)}; evidence ${output}\n`,
    );
  }
} finally {
  await ownedTemporary.cleanup();
}

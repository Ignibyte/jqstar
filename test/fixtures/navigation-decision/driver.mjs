import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const contract = JSON.parse(
  await readFile(new URL("../../../quality/navigation-decision.json", import.meta.url), "utf8"),
).contract;
const pause = (milliseconds) =>
  new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));
const enhanced = (candidate) => candidate.host !== "browser";

async function until(read, predicate = Boolean, timeout = 4000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    try {
      value = await read();
      if (predicate(value)) return value;
    } catch {
      /* A document can be between realms. */
    }
    await pause(30);
  }
  throw new Error("Navigation fixture condition timed out.");
}
async function ready(page, candidate) {
  if (candidate.javascript) {
    await page.waitForFunction(() => Boolean(globalThis.__navigationFixture), undefined, {
      timeout: 4000,
    });
    await page.evaluate(() => globalThis.__navigationFixture.barrier());
    await until(() =>
      page.evaluate(
        () =>
          globalThis.document.documentElement.getAttribute("aria-busy") !== "true" &&
          !globalThis.document.querySelector(".htmx-request, .htmx-swapping, .htmx-settling"),
      ),
    );
    await page.evaluate(
      () => new Promise((resolveFrame) => globalThis.requestAnimationFrame(() => resolveFrame())),
    );
  }
}
async function route(page, name, candidate) {
  await until(
    () => page.locator("#main").getAttribute("data-route"),
    (value) => value === name,
  );
  await ready(page, candidate);
}
async function metrics(page, base) {
  return (await page.request.get(`${base}/metrics`)).json();
}
async function live(page) {
  try {
    return await page.evaluate(() => globalThis.__navigationFixture?.snapshot() ?? null);
  } catch {
    return null;
  }
}
async function observed(page) {
  try {
    return await page.evaluate(() => {
      const { document, window } = globalThis;
      const main = document.getElementById("main");
      const focus = document.activeElement;
      const allowed = ["title", "destination", "preference", "query-value"];
      return {
        hasMain: Boolean(main),
        route: main?.getAttribute("data-route") ?? "browser-error",
        focus: allowed.includes(focus?.id) ? focus.id : focus === document.body ? "body" : "other",
        scrollY: Math.round(window.scrollY),
        historyLength: window.history.length,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        busy:
          document.documentElement.getAttribute("aria-busy") === "true" ||
          document.body.classList.contains("htmx-request"),
      };
    });
  } catch {
    return {
      hasMain: false,
      route: "browser-error",
      focus: "other",
      scrollY: 0,
      historyLength: 0,
      horizontalOverflow: false,
      busy: false,
    };
  }
}
async function errorVisible(page) {
  return (
    (await page
      .locator("#error-summary")
      .isVisible()
      .catch(() => false)) ||
    (await page
      .locator("#recovery")
      .isVisible()
      .catch(() => false))
  );
}
async function errorAccessible(page) {
  await until(async () => (await errorVisible(page)) && (await observed(page)).focus === "title");
  return true;
}
async function destinationVisible(page) {
  const box = await page.locator("#destination").boundingBox();
  const viewport = page.viewportSize();
  return Boolean(box && viewport && box.y >= -2 && box.y < viewport.height);
}

async function pointerTargets(page, ids) {
  await page.locator(`#${ids[0]}`).scrollIntoViewIfNeeded();
  const targets = {};
  for (const id of ids) {
    const box = await page.locator(`#${id}`).boundingBox();
    if (!box) throw new Error("Navigation pointer target is unavailable.");
    targets[id] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  return async (id) => page.mouse.click(targets[id].x, targets[id].y);
}

async function runFlow(context) {
  const { page, base, candidate, scenario, check, baseline, failures } = context;
  const getMetrics = () => metrics(page, base);
  const visit = async (id, target) => {
    await page.locator(`#${id}`).click();
    await route(page, target, candidate);
  };
  const checks = (names, value) => names.forEach((name) => check(name, value));
  const canonical = async (target) => (await observed(page)).route === target;
  switch (scenario.key) {
    case "direct": {
      check("canonicalDocument", await canonical("start"));
      check(
        "accessibleLandmarks",
        (await page.locator("html[lang=en] main h1").count()) === 1 &&
          (await page.locator('nav[aria-label="Documents"]').count()) === 1,
      );
      await page.locator("#disclosure summary").click();
      check("nativeDisclosure", await page.locator("#disclosure").evaluate((node) => node.open));
      const snapshot = await live(page);
      check(
        "ownedRoots",
        !candidate.javascript || (snapshot.live > 3 && snapshot.connectedLive === snapshot.live),
      );
      break;
    }
    case "visit": {
      await visit("query", "guide");
      const url = new URL(page.url());
      check(
        "canonicalURL",
        url.pathname === "/navigation/guide" && url.searchParams.get("view") === "details",
      );
      check("canonicalTitle", (await page.title()) === "jQStar navigation guide");
      check("oneRead", (await getMetrics()).reads - baseline.reads === 1);
      check("zeroWrites", (await getMetrics()).writes === 0);
      check("canonicalDocument", await canonical("guide"));
      break;
    }
    case "local-anchor": {
      await page.locator("#local-anchor").click();
      await until(() => destinationVisible(page));
      check("zeroReads", (await getMetrics()).reads === baseline.reads);
      check("zeroWrites", (await getMetrics()).writes === 0);
      check("anchorVisible", await destinationVisible(page));
      break;
    }
    case "remote-anchor": {
      await visit("remote-anchor", "long");
      await until(() => destinationVisible(page));
      check("oneRead", (await getMetrics()).reads - baseline.reads === 1);
      check("anchorVisible", await destinationVisible(page));
      check(
        "canonicalURL",
        new URL(page.url()).pathname === "/navigation/long" &&
          new URL(page.url()).hash === "#destination",
      );
      break;
    }
    case "history": {
      const scrollCount =
        (await live(page))?.events.filter((event) => event.event === "scroll-observed").length ?? 0;
      await page.evaluate(() => globalThis.scrollTo(0, 500));
      if (candidate.javascript) {
        await until(
          () => live(page),
          (report) =>
            report.events.filter((event) => event.event === "scroll-observed").length > scrollCount,
        );
      }
      await visit("guide", "guide");
      await page.goBack();
      await route(page, "start", candidate);
      await until(
        () => page.evaluate(() => globalThis.scrollY),
        (value) => Math.abs(value - 500) < 3,
      );
      check("restoredScroll", Math.abs((await observed(page)).scrollY - 500) < 3);
      await page.goForward();
      await route(page, "guide", candidate);
      check("canonicalHistory", new URL(page.url()).pathname === "/navigation/guide");
      await page.reload();
      await route(page, "guide", candidate);
      const report = await getMetrics();
      check("reloadIsGET", report.requests.at(-1).method === "GET");
      check("cacheFacts", report.reads >= 3 && report.writes === 0);
      break;
    }
    case "eligibility": {
      const popup = page.waitForEvent("popup");
      await page.locator("#new-tab").click();
      const opened = await popup;
      await opened.waitForLoadState();
      const target = new URL(opened.url()).pathname === "/navigation/guide";
      await opened.close();
      const modified = page.context().waitForEvent("page");
      await page
        .locator("#guide")
        .click({ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] });
      const tab = await modified;
      await tab.waitForLoadState();
      check("browserOwnedTarget", target && new URL(tab.url()).pathname === "/navigation/guide");
      await tab.close();
      check("unchangedOriginalDocument", await canonical("start"));
      check("zeroWrites", (await getMetrics()).writes === 0);
      break;
    }
    case "redirect": {
      await visit("redirect", "guide");
      check("twoReads", (await getMetrics()).reads - baseline.reads === 2);
      check("canonicalURL", new URL(page.url()).pathname === "/navigation/guide");
      check("canonicalTitle", (await page.title()) === "jQStar navigation guide");
      check("canonicalDocument", await canonical("guide"));
      break;
    }
    case "http-errors": {
      let visible = true;
      let focused = true;
      for (const [link, target] of [
        ["not-found", "not-found"],
        ["server-error", "server-error"],
      ]) {
        await visit(link, target);
        visible &&= await errorVisible(page);
        focused &&= await errorAccessible(page);
        await page.goto(`${base}/start`);
        await ready(page, candidate);
      }
      const statuses = (await getMetrics()).requests.map((request) => request.status);
      check("authoritativeStatus", statuses.includes(404) && statuses.includes(500));
      check("visibleError", visible);
      check("accessibleError", focused);
      check("zeroWrites", (await getMetrics()).writes === 0);
      break;
    }
    case "content-types": {
      const download = page.waitForEvent("download");
      await page.locator("#download").click();
      const received = await download;
      check(
        "downloadReceived",
        received.suggestedFilename() === "example.txt" && (await received.failure()) === null,
      );
      await page.locator("#non-html").click();
      await until(
        () => page.locator("body").textContent(),
        (value) => value?.includes("Canonical plain text"),
      );
      check(
        "nonHTMLReceived",
        (await page.locator("body").textContent()).includes("Canonical plain text"),
      );
      check("zeroWrites", (await getMetrics()).writes === 0);
      break;
    }
    case "head": {
      const origin = await page.evaluate(() => performance.timeOrigin);
      await visit("head-change", "head");
      check(
        "canonicalHead",
        (await page.locator('meta[name="navigation-page"]').getAttribute("content")) === "head",
      );
      check(
        "canonicalStyle",
        await page
          .locator("#main")
          .evaluate((node) => globalThis.getComputedStyle(node).borderTopWidth === "7px"),
      );
      check(
        "canonicalScript",
        await page.evaluate(
          (enabled) =>
            enabled
              ? globalThis.__navigationHeadProof === 1
              : globalThis.__navigationHeadProof === undefined,
          candidate.javascript,
        ),
      );
      check("fullDocumentBoundary", origin !== (await page.evaluate(() => performance.timeOrigin)));
      break;
    }
    case "get-form": {
      await page.locator("#query-value").fill("navigation");
      await page.locator("#search-submit").click();
      await route(page, "search", candidate);
      const request = (await getMetrics()).requests.findLast((item) => item.route === "search");
      check("canonicalQuery", new URL(page.url()).searchParams.get("query") === "navigation");
      check("submitterIncluded", request.submitterMatched);
      check("disabledExcluded", request.disabledExcluded);
      check("zeroWrites", (await getMetrics()).writes === 0);
      break;
    }
    case "validation": {
      await page.locator("#title").fill("");
      await page.locator("#save").click();
      check("zeroDispatch", (await getMetrics()).requests.length === baseline.requests.length);
      check(
        "invalidFocus",
        await page
          .locator("#title")
          .evaluate((node) => node === node.ownerDocument.activeElement && !node.validity.valid),
      );
      break;
    }
    case "write": {
      await page.locator("#attachment").setInputFiles({
        name: "navigation-proof.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("navigation-file-proof"),
      });
      await page.locator("#save").click();
      await route(page, "saved", candidate);
      const report = await getMetrics();
      const write = report.requests.find((request) => request.method === "POST");
      check("oneWrite", report.writes === 1);
      check("multipartFile", write.multipart && write.fileMatched);
      check("submitterIncluded", write.submitterMatched);
      check("disabledExcluded", write.disabledExcluded);
      check("revisionAdvanced", report.revision === 2);
      check(
        "redirectIsGET",
        write.status === 303 &&
          report.requests.at(-1).method === "GET" &&
          new URL(page.url()).pathname === "/navigation/saved",
      );
      await page.reload();
      await route(page, "saved", candidate);
      const reloaded = await getMetrics();
      check("reloadIsGET", reloaded.writes === 1 && reloaded.requests.at(-1).method === "GET");
      break;
    }
    case "preview": {
      await page.locator("#preview").click();
      await route(page, "preview", candidate);
      const report = await getMetrics();
      check(
        "previewSubmitter",
        report.requests.find((request) => request.method === "POST").submitterMatched,
      );
      check("zeroCommittedWrites", report.writes === 0 && report.revision === 1);
      check("authoritativePreview", new URL(page.url()).pathname === "/navigation/preview");
      break;
    }
    case "server-validation": {
      await page.locator("#title").fill("invalid");
      await page.locator("#save").click();
      await route(page, "edit", candidate);
      const validation = await errorAccessible(page);
      await page.goto(`${base}/start`);
      await ready(page, candidate);
      await page.locator('input[name="revision"]').evaluate((node) => {
        node.value = "0";
      });
      await page.locator("#save").click();
      await route(page, "edit", candidate);
      const conflict = await errorAccessible(page);
      const report = await getMetrics();
      const statuses = report.requests.map((request) => request.status);
      check("authoritativeStatus", statuses.includes(422) && statuses.includes(409));
      check("revisionUnchanged", report.revision === 1 && report.writes === 0);
      checks(["visibleError", "accessibleError"], validation && conflict);
      break;
    }
    case "write-loss": {
      await page
        .locator("#lose-response")
        .click({ noWaitAfter: true })
        .catch(() => {});
      await until(getMetrics, (value) => value.writes === 1);
      await pause(300);
      const report = await getMetrics();
      check("oneWrite", report.writes === 1);
      check(
        "noAutomaticReplay",
        report.requests.filter((request) => request.method === "POST").length === 1,
      );
      check("visibleRecovery", enhanced(candidate) ? await errorVisible(page) : failures() > 0);
      break;
    }
    case "region": {
      const previous = await page.evaluate(() => performance.timeOrigin);
      await page.locator("#region-link").click();
      await until(
        () => page.locator("#activity-title").textContent(),
        (value) => value === "Updated activity",
      );
      await ready(page, candidate);
      check(
        "canonicalRegion",
        (await page.locator("#activity-title").textContent()) === "Updated activity",
      );
      check(
        "unrelatedContentRetainedWhenEnhanced",
        !enhanced(candidate) ||
          (previous === (await page.evaluate(() => performance.timeOrigin)) &&
            (await canonical("start"))),
      );
      check(
        "regionAsDocumentWithoutEnhancement",
        enhanced(candidate) ||
          ((await canonical("region")) && new URL(page.url()).pathname === "/navigation/region"),
      );
      break;
    }
    case "region-mismatch": {
      await page.locator("#region-mismatch").click();
      await route(page, "region-mismatch", candidate);
      check("noWrongTargetCommit", (await page.locator("#region-fallback").count()) === 1);
      check("visibleRecovery", (await page.locator("#region-fallback h2").count()) === 1);
      check("canonicalFallback", new URL(page.url()).pathname === "/navigation/region-mismatch");
      break;
    }
    case "supersession": {
      const click = await pointerTargets(page, ["slow", "fast"]);
      await click("slow");
      await until(getMetrics, (value) =>
        value.requests.some((request) => request.route === "slow"),
      );
      await click("fast");
      await route(page, "fast", candidate);
      await pause(950);
      const report = await getMetrics();
      check("lastIntentWins", await canonical("fast"));
      check(
        "noStaleCommit",
        !(await live(page))?.bridge.some((event) => event.outcome === "failed-after-mutation") &&
          (await canonical("fast")),
      );
      check(
        "requestCancellationFacts",
        report.requests.some((request) => request.route === "slow" && request.aborted),
      );
      check("zeroWrites", report.writes === 0);
      break;
    }
    case "cancel-intent": {
      const previous = await live(page);
      await page.locator("#canceled").click();
      await pause(50);
      check("zeroDispatch", (await getMetrics()).requests.length === baseline.requests.length);
      const current = await live(page);
      check(
        "outgoingRootsRemainLive",
        current.created === previous.created &&
          current.released === previous.released &&
          (await canonical("start")),
      );
      break;
    }
    case "network-error": {
      const previous = await live(page);
      await page
        .locator("#network-error")
        .click({ noWaitAfter: true })
        .catch(() => {});
      await until(getMetrics, (value) =>
        value.requests.some((request) => request.route === "network-error"),
      );
      await pause(200);
      check("visibleRecovery", enhanced(candidate) ? await errorVisible(page) : failures() > 0);
      check("zeroWrites", (await getMetrics()).writes === 0);
      const current = await live(page);
      check(
        "outgoingRootsRemainLiveWithoutMutation",
        !enhanced(candidate) ||
          (current?.live === previous.live && current?.released === previous.released),
      );
      break;
    }
    case "no-content": {
      const previous = await live(page);
      await page.locator("#no-content").click({ noWaitAfter: true });
      await until(getMetrics, (value) => value.requests.some((request) => request.status === 204));
      await pause(100);
      const current = await live(page);
      check(
        "zeroMutation",
        !candidate.javascript ||
          (current.created === previous.created && current.released === previous.released),
      );
      check("zeroWrites", (await getMetrics()).writes === 0);
      check("unchangedDocument", await canonical("start"));
      break;
    }
    case "preservation": {
      await page.locator("#preference").fill("local-preference-proof");
      if (candidate.javascript)
        await page.evaluate(() => globalThis.__navigationFixture.capturePreserved());
      await visit("guide", "guide");
      const kept = enhanced(candidate)
        ? await page.evaluate(() => globalThis.__navigationFixture.preservation())
        : null;
      check(
        "preservedIdentityWhenEnhanced",
        !enhanced(candidate) ||
          (kept.sameNode &&
            kept.sameApplication &&
            kept.sameState &&
            (await page.locator("#preference").inputValue()) === "local-preference-proof"),
      );
      check(
        "canonicalServerStateForFullDocument",
        enhanced(candidate) ||
          (await page.locator("#preference").inputValue()) === "server-default",
      );
      break;
    }
    case "lifecycle": {
      for (let index = 0; index < 4; index += 1) {
        await visit("guide", "guide");
        await visit("home", "start");
      }
      const report = await live(page);
      check(
        "noDuplicateApplications",
        report.duplicates === 0 && report.live === report.connectedLive,
      );
      const groups = new Map();
      for (const event of report.bridge) {
        if (event.renderOperation === null) continue;
        if (!groups.has(event.renderOperation)) groups.set(event.renderOperation, []);
        groups.get(event.renderOperation).push(event.phase);
      }
      const committed = [...groups.values()].filter((phases) => phases.includes("committed"));
      check(
        "orderedBridgePhases",
        !enhanced(candidate) ||
          (committed.length > 0 &&
            committed.every((phases) =>
              ["prepared", "removing", "externally-mutated", "enhancing", "committed"].every(
                (phase, index, required) =>
                  phases.includes(phase) &&
                  (index === 0 || phases.indexOf(phase) > phases.indexOf(required[index - 1])),
              ),
            )),
      );
      check("createdReleasedLiveReconcile", report.created === report.released + report.live);
      const disposal = await page.evaluate(() => globalThis.__navigationFixture.dispose());
      check("zeroFailedDisposal", disposal.failed === 0);
      check(
        "zeroRemainingDisposal",
        disposal.remaining === 0 && disposal.live === 0 && disposal.created === disposal.released,
      );
      break;
    }
    case "progress": {
      const click = await pointerTargets(page, ["slow"]);
      await click("slow");
      await until(getMetrics, (value) =>
        value.requests.some((request) => request.route === "slow"),
      );
      check(
        "visibleProgress",
        !enhanced(candidate) || (await page.locator("#progress").isVisible()),
      );
      await page.keyboard.press("Tab");
      await route(page, "slow", candidate);
      await page.locator("#query-value").fill("");
      await page.keyboard.type("keyboard-ready");
      check(
        "keyboardContinuity",
        (await page.locator("#query-value").inputValue()) === "keyboard-ready" &&
          (await observed(page)).focus === "query-value",
      );
      check("settledBusyState", !(await observed(page)).busy);
      break;
    }
    case "private-cache": {
      let policies = true;
      let restoration = true;
      let noStoredContent = true;
      for (const entry of ["direct", "link"]) {
        let response;
        if (entry === "direct") {
          response = await page.goto(`${base}/private`);
          await ready(page, candidate);
        } else {
          await page.goto(`${base}/start`);
          await ready(page, candidate);
          const pending = page.waitForResponse(
            (value) => new URL(value.url()).pathname === "/navigation/private",
          );
          await visit("private", "private");
          response = await pending;
        }
        policies = response.headers()["cache-control"] === "private, no-store" && policies;
        const initial = await getMetrics();
        await visit("guide", "guide");
        await page.goBack();
        await route(page, "private", candidate);
        const report = await getMetrics();
        restoration = report.reads >= initial.reads + 1 && report.writes === 0 && restoration;
        const clean = await page.evaluate(() =>
          Object.values(globalThis.localStorage).every(
            (value) => !value.includes("private-fixture-marker"),
          ),
        );
        noStoredContent = clean && noStoredContent;
      }
      check("privateResponsePolicy", policies);
      check("restorationRequestFacts", restoration);
      check("noPrivateWebStorage", noStoredContent);
      break;
    }
    case "prefetch": {
      await page.locator("#guide").hover();
      await pause(250);
      check("zeroIncidentalRequests", (await getMetrics()).reads === baseline.reads);
      check("zeroWrites", (await getMetrics()).writes === 0);
      break;
    }
    case "accessibility": {
      await page.locator("#disclosure summary").focus();
      await page.keyboard.press("Enter");
      check("keyboardDisclosure", await page.locator("#disclosure").evaluate((node) => node.open));
      check(
        "visibleFocus",
        await page
          .locator("#disclosure summary")
          .evaluate(
            (node) =>
              node === node.ownerDocument.activeElement &&
              globalThis.getComputedStyle(node).outlineStyle !== "none",
          ),
      );
      let overflow = false;
      for (const preferences of [{ reducedMotion: "reduce" }, { forcedColors: "active" }]) {
        await page.emulateMedia(preferences);
        overflow ||= (await observed(page)).horizontalOverflow;
      }
      await page.setViewportSize({ width: 320, height: 720 });
      await page.evaluate(() => {
        globalThis.document.documentElement.style.fontSize = "200%";
      });
      overflow ||= (await observed(page)).horizontalOverflow;
      check("noHorizontalOverflow", !overflow);
      await page.goto(`${base}/not-found`);
      await ready(page, candidate);
      check("accessibleError", await errorAccessible(page));
      break;
    }
    default:
      throw new Error("Unknown frozen navigation flow.");
  }
}

export async function runNavigationScenarios(browser, origin, candidate, options = {}) {
  const flows = [];
  for (const scenario of contract.scenarios.filter(
    (item) => !options.subset || options.subset.includes(item.id),
  )) {
    if (scenario.applicability === "javascript" && !candidate.javascript) {
      flows.push({
        id: scenario.id,
        status: "not-applicable",
        reason: "javascript-only instrumentation or intent",
        assertions: [],
        requests: [],
        events: [],
      });
      continue;
    }
    const context = await browser.newContext({
      javaScriptEnabled: candidate.javascript,
      viewport: { width: 1100, height: 760 },
      acceptDownloads: true,
    });
    context.setDefaultTimeout(4000);
    const base = `${origin}/navigation`;
    await context.addCookies([
      { name: "jqs-nav-session", value: randomUUID(), url: origin },
      { name: "jqs-nav-candidate", value: candidate.id, url: origin },
      { name: "jqs-nav-configuration", value: options.configuration ?? "configured", url: origin },
    ]);
    const page = await context.newPage();
    let requestFailures = 0;
    let scriptRequests = 0;
    let scriptErrors = 0;
    page.on("pageerror", () => {
      scriptErrors += 1;
    });
    page.on("requestfailed", () => {
      requestFailures += 1;
    });
    page.on("request", (request) => {
      if (request.resourceType() === "script") scriptRequests += 1;
    });
    const assertions = [];
    const check = (key, actual) => assertions.push({ key, passed: actual === true });
    let failure = null;
    let baseline;
    const watchdog = setTimeout(() => page.close().catch(() => {}), 30000);
    try {
      await page.goto(`${base}/start`);
      await ready(page, candidate);
      baseline = await metrics(page, base);
      await runFlow({
        page,
        base,
        candidate,
        scenario,
        check,
        baseline,
        failures: () => requestFailures,
      });
    } catch (error) {
      failure =
        error?.name === "TimeoutError" || String(error?.message).includes("timed out")
          ? "timeout"
          : "fixture-condition";
    } finally {
      clearTimeout(watchdog);
    }
    for (const key of scenario.assertions)
      if (!assertions.some((assertion) => assertion.key === key))
        assertions.push({ key, passed: false });
    const state = await observed(page);
    const lifecycle = await live(page);
    let disposal = null;
    if (candidate.javascript) {
      try {
        disposal = await page.evaluate(() => globalThis.__navigationFixture?.dispose() ?? null);
      } catch {
        /* Browser-owned error page. */
      }
    }
    const server = await metrics(page, base);
    const unhandledScriptErrors =
      (lifecycle?.unhandledErrors ?? scriptErrors) +
      server.events
        .filter((event) => event.event === "document-disposed")
        .reduce((count, event) => count + (event.unhandledErrors ?? 0), 0);
    if (unhandledScriptErrors > 0) failure = "script-error";
    if (
      candidate.javascript &&
      state.hasMain &&
      (!disposal ||
        disposal.failed !== 0 ||
        disposal.remaining !== 0 ||
        disposal.live !== 0 ||
        disposal.created !== disposal.released)
    )
      failure = "disposal";
    if (
      server.events.some(
        (event) =>
          event.event === "document-disposed" &&
          (event.failed > 0 || event.remaining > 0 || event.live > 0),
      )
    )
      failure = "disposal";
    const flow = {
      id: scenario.id,
      status: !failure && assertions.every((assertion) => assertion.passed) ? "pass" : "fail",
      failure,
      assertions,
      state,
      requestFailures,
      scriptRequests,
      scriptErrors,
      unhandledScriptErrors,
      reads: server.reads - (baseline?.reads ?? 0),
      writes: server.writes,
      revision: server.revision,
      requests: server.requests,
      events: server.events,
      lifecycle,
      disposal,
    };
    flows.push(flow);
    options.onFlow?.(flow);
    await context.close();
  }
  return {
    candidate: candidate.id,
    configuration: options.configuration ?? "configured",
    browserVersion: browser.version(),
    flows,
  };
}

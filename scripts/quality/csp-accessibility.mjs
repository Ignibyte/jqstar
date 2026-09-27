import assert from "node:assert/strict";

export const cspAccessibilityProfiles = ["reduced-motion", "forced-colors", "zoom-reflow"];

async function proveProfile(browser, origin, policy, profile, reports) {
  reports.length = 0;
  const context = await browser.newContext({
    viewport: { width: profile === "zoom-reflow" ? 640 : 900, height: 900 },
    reducedMotion: profile === "reduced-motion" ? "reduce" : "no-preference",
    forcedColors: profile === "forced-colors" ? "active" : "none",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    const responses = [];
    page.on("pageerror", () => errors.push("page error"));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const value = message.text().toLowerCase();
      if (
        !["content security policy", "refused to evaluate", "unsafe-eval"].some((marker) =>
          value.includes(marker),
        )
      ) {
        errors.push("console error");
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 300 && response.status() < 400) return;
      responses.push({
        url: response.url(),
        policy: response.headers()["content-security-policy"],
      });
    });
    const response = await page.goto(`${origin}/csp`);
    assert.equal(response?.status(), 200, `${profile}: CSP document failed`);
    assert.equal(
      response.headers()["content-security-policy"],
      policy,
      `${profile}: policy changed`,
    );
    await page.waitForFunction(() => document.documentElement.dataset.jqstarCspReady === "true");
    if (profile === "zoom-reflow") {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
        document.body.style.zoom = "2";
      });
    }
    await proveCSPInitialKeyboard(page, profile);
    await page.keyboard.press(browser.browserType().name() === "webkit" ? "Alt+Tab" : "Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "save",
      `${profile}: Save is not next in tab order`,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#saved").textContent === "saved");
    await page.keyboard.press(browser.browserType().name() === "webkit" ? "Alt+Tab" : "Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "toggle",
      `${profile}: toggle is not next in tab order`,
    );
    await page.keyboard.press("Space");
    assert.equal(
      await page.getByRole("button", { name: "Toggle package proof" }).getAttribute("aria-pressed"),
      "true",
      `${profile}: keyboard toggle did not expose pressed state`,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "toggle",
      `${profile}: toggle lost focus`,
    );
    await page.keyboard.press("Space");
    assert.equal(
      await page.locator("#toggle").getAttribute("aria-pressed"),
      "false",
      `${profile}: keyboard toggle did not reset`,
    );
    assert(
      await page.getByRole("textbox", { name: "Name", exact: true }).isEditable(),
      `${profile}: named native input is unavailable`,
    );
    const layout = await page.evaluate(() => {
      const control = document.querySelector("#native-name");
      const style = getComputedStyle(document.querySelector("#toggle"));
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        forcedColors: matchMedia("(forced-colors: active)").matches,
        rootFontPixels: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        zoom: Number.parseFloat(getComputedStyle(document.body).zoom),
        inputWidth: control.getBoundingClientRect().width,
        bodyWidth: document.body.getBoundingClientRect().width,
        scrollBehavior: style.scrollBehavior,
        supportsForcedColorAdjust: CSS.supports("forced-color-adjust", "auto"),
        forcedColorAdjust: style.getPropertyValue("forced-color-adjust") || null,
        borderStyle: style.borderStyle,
        outlineStyle: style.outlineStyle,
      };
    });
    assert.equal(
      layout.reducedMotion,
      profile === "reduced-motion",
      `${profile}: motion profile not active`,
    );
    assert.equal(
      layout.forcedColors,
      profile === "forced-colors",
      `${profile}: color profile not active`,
    );
    assert(
      layout.documentWidth <= layout.viewportWidth,
      `${profile}: document overflows (${layout.documentWidth}/${layout.viewportWidth})`,
    );
    assert(
      layout.inputWidth <= layout.bodyWidth,
      `${profile}: native input overflows its container`,
    );
    if (profile === "reduced-motion") assert.equal(layout.scrollBehavior, "auto");
    if (profile === "forced-colors") {
      assert.equal(layout.forcedColorAdjust, layout.supportsForcedColorAdjust ? "auto" : null);
      assert.notEqual(layout.borderStyle, "none");
      assert.notEqual(layout.outlineStyle, "none");
    }
    if (profile === "zoom-reflow") {
      assert.equal(layout.rootFontPixels, 32);
      assert.equal(layout.zoom, 2);
    }
    const result = await page.evaluate(() => window.__finishJQStarCSPProof());
    assertCSPApplicationResult(result);
    assert.deepEqual(result.state, {
      asyncMessage: "settled",
      count: 8,
      saved: true,
      serverMessage: "sdk",
    });
    assert.equal(result.dom.togglePressed, "true");
    assert.equal(result.accessibilityViolations.length, 0, `${profile}: axe violations`);
    assert(
      result.instrumentation && result.canary.blocked,
      `${profile}: CSP instrumentation failed`,
    );
    assert(
      result.events.every(
        (event) => event.blockedURI === "eval" && event.effectiveDirective.startsWith("script-src"),
      ),
      `${profile}: unexpected policy event`,
    );
    assert(
      Object.values(result.runtimeCalls).every((count) => count === 0),
      `${profile}: dynamic-code primitive reached`,
    );
    assert.equal(result.disposal.failed, 0);
    assert.equal(result.disposal.remaining, 0);
    assert(result.disposal.attempted > 0 && result.disposal.attempted === result.disposal.released);
    const unexpectedReports = reports.filter(
      (event) => event.blockedURI !== "eval" || !event.effectiveDirective.startsWith("script-src"),
    );
    assert.equal(unexpectedReports.length, 0, `${profile}: unexpected policy report`);
    assert.equal(errors.length, 0, `${profile}: unexpected browser errors`);
    const redirectResponse = await page.request.get(`${origin}/csp-redirect`, { maxRedirects: 0 });
    assert.equal(redirectResponse.status(), 302);
    assert.equal(redirectResponse.headers().location, "/csp-json");
    assert.equal(result.endpointStatus.redirect, 200);
    responses.push({
      url: redirectResponse.url(),
      policy: redirectResponse.headers()["content-security-policy"],
    });
    const errorResponse = await page.request.get(`${origin}/csp-error`);
    assert.equal(errorResponse.status(), 404);
    responses.push({
      url: errorResponse.url(),
      policy: errorResponse.headers()["content-security-policy"],
    });
    assert(
      responses.length > 0 &&
        responses.every((item) => item.url.startsWith(`${origin}/`) && item.policy === policy),
      `${profile}: response policy changed: ${JSON.stringify(responses.filter((item) => !item.url.startsWith(`${origin}/`) || item.policy !== policy))}`,
    );
    return {
      profile,
      status: "pass",
      ...layout,
      headerResponses: responses.length,
      unexpectedErrors: 0,
      unexpectedPolicyEvents: 0,
      unexpectedPolicyReports: 0,
      runtimeErrors: result.runtimeErrors,
      computed: result.computed,
      behavior: result.behavior,
      axeViolations: 0,
      keyboard: "behavior-increment-save-toggle",
      tabKey: browser.browserType().name() === "webkit" ? "Alt+Tab" : "Tab",
      disposal: result.disposal,
    };
  } finally {
    await context.close();
  }
}

export async function proveCSPAccessibility(browser, origin, policy, reports) {
  const results = [];
  for (const profile of cspAccessibilityProfiles)
    results.push(await proveProfile(browser, origin, policy, profile, reports));
  assertCSPProfileEvidence(results);
  return results;
}

export async function proveCSPNative(browser, origin, policy) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const scripts = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    const response = await page.goto(`${origin}/csp`);
    assert.equal(response?.status(), 200);
    assert.equal(response.headers()["content-security-policy"], policy);
    assert.equal(await page.locator("#result").textContent(), "Running");
    const [destination] = await Promise.all([
      page.waitForNavigation(),
      page.getByRole("link", { name: "Native destination" }).click(),
    ]);
    assert.equal(destination?.status(), 200, "Native CSP destination failed");
    assert.equal(new URL(page.url()).pathname, "/csp-destination");
    assert.equal(destination.headers()["content-security-policy"], policy);
    assert.equal(
      await page.getByRole("heading", { name: "Native destination", exact: true }).count(),
      1,
    );
    await page.goto(`${origin}/csp`);
    await page.getByRole("textbox", { name: "Name", exact: true }).fill("CSP <native> & proof");
    const [submitted] = await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Submit", exact: true }).click(),
    ]);
    assert.equal(submitted?.status(), 200, "Native CSP form submission failed");
    const url = new URL(page.url());
    assert.equal(url.pathname, "/csp-form");
    assert.equal(url.searchParams.get("name"), "CSP <native> & proof");
    assert.equal(submitted.headers()["content-security-policy"], policy);
    assert.equal(
      await page.getByRole("heading", { name: "Native form received", exact: true }).count(),
      1,
    );
    assert.equal(await page.locator("#received-name").textContent(), "CSP <native> & proof");
    assert.equal(await page.locator("#received-name native").count(), 0);
    assert.equal(scripts.length, 0, "No-JavaScript CSP page requested scripts");
    return {
      link: "navigated",
      form: "submitted",
      scriptRequests: scripts.length,
      policy: "unchanged",
      linkStatus: destination.status(),
      formStatus: submitted.status(),
      receivedName: await page.locator("#received-name").textContent(),
    };
  } finally {
    await context.close();
  }
}

export function assertCSPApplicationResult(result) {
  assert.equal(result.runtimeErrors, 0, "CSP proof recorded a handled runtime error");
  assert.deepEqual(
    result.computed,
    { initial: "2", afterIncrement: "4", final: "16" },
    "CSP computed observations differ",
  );
  assert.deepEqual(
    result.behavior,
    {
      initial: { count: "1", double: "2" },
      afterKeyboard: { count: "2", double: "4", activations: 1 },
      afterPatches: { count: "2", double: "4" },
      afterRootDestroy: { count: "3", double: "6", activations: 2, mainCount: 8, survived: true },
      destroyedOnDispose: true,
    },
    "CSP behavior application lost isolation or lifecycle ownership",
  );
}

export function assertCSPProfileEvidence(results) {
  assert.deepEqual(
    results.map(({ profile }) => profile),
    cspAccessibilityProfiles,
    "CSP accessibility profile roster changed",
  );
  for (const result of results) {
    assertCSPApplicationResult(result);
    assert.equal(result.status, "pass");
    for (const key of [
      "runtimeErrors",
      "unexpectedErrors",
      "unexpectedPolicyEvents",
      "unexpectedPolicyReports",
      "axeViolations",
    ])
      assert.equal(result[key], 0, `CSP profile ${key} is not zero`);
    assert(Number.isFinite(result.viewportWidth) && result.viewportWidth > 0);
    assert(Number.isFinite(result.documentWidth) && result.documentWidth > 0);
    assert(result.documentWidth <= result.viewportWidth, "CSP profile document overflows");
    assert(Number.isFinite(result.inputWidth) && result.inputWidth > 0);
    assert(Number.isFinite(result.bodyWidth) && result.bodyWidth > 0);
    assert(result.inputWidth <= result.bodyWidth, "CSP profile input overflows");
    assert.equal(
      result.reducedMotion,
      result.profile === "reduced-motion",
      "CSP motion profile not active",
    );
    assert.equal(
      result.forcedColors,
      result.profile === "forced-colors",
      "CSP color profile not active",
    );
    assert.equal(result.rootFontPixels, result.profile === "zoom-reflow" ? 32 : 16);
    assert.equal(result.zoom, result.profile === "zoom-reflow" ? 2 : 1);
    assert.equal(result.scrollBehavior, "auto");
    assert.equal(result.forcedColorAdjust, result.supportsForcedColorAdjust ? "auto" : null);
    assert(result.borderStyle && result.borderStyle !== "none");
    assert(result.outlineStyle && result.outlineStyle !== "none");
    assert(Number.isSafeInteger(result.headerResponses) && result.headerResponses > 0);
    assert.equal(result.keyboard, "behavior-increment-save-toggle");
    assert(["Tab", "Alt+Tab"].includes(result.tabKey));
    assert(Number.isSafeInteger(result.disposal.attempted) && result.disposal.attempted > 0);
    assert.equal(result.disposal.attempted, result.disposal.released);
    assert.equal(result.disposal.failed, 0);
    assert.equal(result.disposal.remaining, 0);
  }
}

export async function proveCSPRuntimeErrorDetection(browser, origin, policy) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route(`${origin}/csp-app.js`, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const marker = "const installed = installStarCSP($);";
      assert.equal(source.split(marker).length, 2, "CSP pre-install detector marker changed");
      await route.fulfill({
        response,
        body: source.replace(
          marker,
          '$(document).trigger("jquery-star:error", [{ code: "CSP_PROOF_CONTROL" }]);\n' + marker,
        ),
      });
    });
    const response = await page.goto(`${origin}/csp`);
    assert.equal(response?.status(), 200);
    assert.equal(response.headers()["content-security-policy"], policy);
    await page.waitForFunction(() => document.documentElement.dataset.jqstarCspReady === "true");
    const runtimeErrors = await page.evaluate(() => window.__jqstarCSP.runtimeErrors);
    assert.equal(runtimeErrors, 1, "CSP pre-install runtime error listener is missing");
    assert.throws(() => assertCSPApplicationResult({ runtimeErrors }), /handled runtime error/u);
    return { stage: "before-install", events: runtimeErrors, rejected: true };
  } finally {
    await context.close();
  }
}

export async function proveCSPInitialKeyboard(page, profile) {
  assert.equal(
    await page.locator("#double").textContent(),
    "2",
    `${profile}: initial computed value missing`,
  );
  assert.equal(await page.locator("#behavior-count").textContent(), "1");
  assert.equal(await page.locator("#behavior-double").textContent(), "2");
  await page.getByRole("button", { name: "Increment behavior", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#behavior-count").textContent === "2");
  assert.equal(await page.locator("#behavior-double").textContent(), "4");
  assert.equal(
    await page.locator("#count").textContent(),
    "1",
    `${profile}: behavior root changed declarative state`,
  );
  assert.equal(await page.evaluate(() => document.activeElement.id), "behavior-increment");
  await page.getByRole("button", { name: "Increment", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#count").textContent === "2");
  assert.equal(
    await page.locator("#double").textContent(),
    "4",
    `${profile}: computed state changed`,
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "increment",
    `${profile}: increment lost focus`,
  );
}

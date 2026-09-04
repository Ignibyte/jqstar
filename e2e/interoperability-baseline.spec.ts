import { expect, test } from "@playwright/test";
import type { Browser, Page, Request, Response } from "@playwright/test";

const fixtureOrigin = "http://127.0.0.1:4175";
const turboVersions = ["8.0.21", "8.0.23"] as const;
const htmxVersions = ["2.0.0", "2.0.10"] as const;

interface SemanticRecord {
  event: string;
  focusKey: string;
  historyLength: number;
  host: string;
  outcome: string;
  ownedRootCount: number;
  phase: string;
  preservedRootCount: number;
  sequence: number;
  surfaceFingerprint: string;
  targetCategory: string;
  targetKey: string;
  version: string;
}

interface BridgeObservation {
  bridgeOperationId: number;
  elapsedMs: number;
  flowId: string;
  host: "turbo";
  outcome: string;
  phase: string;
  removalCount: number;
  renderOperationId: number | null;
  schema: string;
  sequence: number;
  targetCategory: string;
  version: string;
}

interface HtmxBridgeObservation {
  bridgeOperationId: number;
  elapsedMs: number;
  eventId: string;
  flowId: string;
  host: "htmx";
  outcome: string;
  phase: string;
  removalCount: number;
  renderOperationId: number | null;
  schema: string;
  sequence: number;
  swapStyle: string;
  targetCategory: string;
  version: string;
}

async function openHost(page: Page, host: "htmx" | "turbo", version: string, bridge = false) {
  await page.goto(`${fixtureOrigin}/interop/${host}/${version}/start${bridge ? "?bridge=1" : ""}`);
  await page.waitForFunction(
    ([expectedHost, expectedVersion]) => {
      const interop = (
        window as unknown as {
          __interop?: { host: string; expectedVersion: string };
        }
      ).__interop;
      return interop?.host === expectedHost && interop?.expectedVersion === expectedVersion;
    },
    [host, version],
  );
  if (host === "turbo") {
    await page.waitForFunction(() => customElements.get("turbo-frame") !== undefined);
    await page.waitForFunction(
      (expectedVersion) =>
        (
          window as unknown as {
            __turboBridge?: { version: string };
          }
        ).__turboBridge?.version === expectedVersion,
      version,
    );
  } else {
    await page.waitForFunction(
      () => typeof (window as unknown as { htmx?: unknown }).htmx === "object",
    );
    if (bridge) {
      await page.waitForFunction(
        (expectedVersion) =>
          (
            window as unknown as {
              __htmxBridge?: { version: string };
            }
          ).__htmxBridge?.version === expectedVersion,
        version,
      );
    }
  }
}

async function bridgeCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __turboBridge: { observations(): BridgeObservation[] };
        }
      ).__turboBridge.observations().length,
  );
}

async function bridgeRecords(page: Page, from = 0): Promise<BridgeObservation[]> {
  await page.evaluate(async () => {
    await (
      window as unknown as {
        __turboBridge: { whenIdle(): Promise<void> };
      }
    ).__turboBridge.whenIdle();
  });
  return page.evaluate(
    (start) =>
      (
        window as unknown as {
          __turboBridge: { observations(): BridgeObservation[] };
        }
      ).__turboBridge
        .observations()
        .slice(start),
    from,
  );
}

function expectBridgeRedacted(trace: BridgeObservation[]) {
  expect(trace.length).toBeGreaterThan(0);
  for (const record of trace) {
    expect(Object.keys(record).sort()).toEqual([
      "bridgeOperationId",
      "elapsedMs",
      "flowId",
      "host",
      "outcome",
      "phase",
      "removalCount",
      "renderOperationId",
      "schema",
      "sequence",
      "targetCategory",
      "version",
    ]);
    expect(record.schema).toBe("jqstar-turbo-bridge-observation/1");
    expect(record.elapsedMs).toBeGreaterThanOrEqual(0);
  }
}

async function htmxBridgeCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __htmxBridge: { observations(): HtmxBridgeObservation[] };
        }
      ).__htmxBridge.observations().length,
  );
}

async function htmxBridgeRecords(page: Page, from = 0): Promise<HtmxBridgeObservation[]> {
  await page.evaluate(async () => {
    await Promise.resolve();
    await (
      window as unknown as {
        __htmxBridge: { whenIdle(): Promise<void> };
      }
    ).__htmxBridge.whenIdle();
  });
  return page.evaluate(
    (start) =>
      (
        window as unknown as {
          __htmxBridge: { observations(): HtmxBridgeObservation[] };
        }
      ).__htmxBridge
        .observations()
        .slice(start),
    from,
  );
}

function expectHtmxBridgeRedacted(trace: HtmxBridgeObservation[]) {
  expect(trace.length).toBeGreaterThan(0);
  expect(JSON.stringify(trace)).not.toMatch(
    /url|query|headers|formValues|requestBody|responseBody|serverResponse|html|dom|signals|selector|historyValue|errorData|message/u,
  );
  for (const record of trace) {
    expect(Object.keys(record).sort()).toEqual([
      "bridgeOperationId",
      "elapsedMs",
      "eventId",
      "flowId",
      "host",
      "outcome",
      "phase",
      "removalCount",
      "renderOperationId",
      "schema",
      "sequence",
      "swapStyle",
      "targetCategory",
      "version",
    ]);
    expect(record.schema).toBe("jqstar-htmx-bridge-observation/1");
    expect(record.host).toBe("htmx");
    expect(record.elapsedMs).toBeGreaterThanOrEqual(0);
  }
}

async function clearRecords(page: Page) {
  await page.evaluate(() => {
    (
      window as unknown as {
        __interop: { clear(): void };
      }
    ).__interop.clear();
  });
}

async function records(page: Page): Promise<SemanticRecord[]> {
  return page.evaluate(() =>
    (
      window as unknown as {
        __interop: { snapshot(): SemanticRecord[] };
      }
    ).__interop.snapshot(),
  );
}

async function waitForEvent(page: Page, event: string) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __interop?: { snapshot(): SemanticRecord[] };
        }
      ).__interop
        ?.snapshot()
        .some((record) => record.event === expected),
    event,
    { timeout: 10_000 },
  );
}

function eventNames(trace: SemanticRecord[]) {
  return trace.map(({ event }) => event);
}

function expectOrdered(trace: SemanticRecord[], required: string[]) {
  const names = eventNames(trace);
  let previous = -1;
  for (const name of required) {
    const index = names.indexOf(name, previous + 1);
    expect(
      index,
      `${name} must follow ${names[previous] ?? "trace start"}: ${names.join(", ")}`,
    ).toBeGreaterThan(previous);
    previous = index;
  }
}

function expectBefore(trace: SemanticRecord[], first: string, second: string) {
  const names = eventNames(trace);
  expect(names.indexOf(first), `${first} must precede ${second}: ${names.join(", ")}`).toBeLessThan(
    names.indexOf(second),
  );
}

function expectRedacted(trace: SemanticRecord[]) {
  expect(trace.length).toBeGreaterThan(0);
  expect(trace.map(({ sequence }) => sequence)).toEqual(trace.map((_, index) => index + 1));
  expect(JSON.stringify(trace)).not.toMatch(
    /url|query|formValues|headers|requestBody|responseBody|html|error|dom|signals|historyValue/u,
  );
  for (const record of trace) {
    expect(Object.keys(record).sort()).toEqual([
      "event",
      "focusKey",
      "historyLength",
      "host",
      "outcome",
      "ownedRootCount",
      "phase",
      "preservedRootCount",
      "sequence",
      "surfaceFingerprint",
      "targetCategory",
      "targetKey",
      "version",
    ]);
    expect(record.surfaceFingerprint).toMatch(/^fnv1a32:[0-9a-f]{8}$/u);
    expect(record.focusKey).toMatch(/^[a-z0-9-]+$/u);
    expect(record.targetKey).toMatch(/^[a-z0-9-]+$/u);
    expect(record.historyLength).toBeGreaterThan(0);
    expect(record.ownedRootCount).toBeGreaterThanOrEqual(0);
    expect(record.preservedRootCount).toBeGreaterThanOrEqual(0);
  }
}

function expectSurfaceChanged(trace: SemanticRecord[], before: string, after: string) {
  const beforeRecord = trace.find(({ event }) => event === before);
  const afterRecord = trace.find(({ event }) => event === after);
  expect(beforeRecord?.surfaceFingerprint).toMatch(/^fnv1a32:/u);
  expect(afterRecord?.surfaceFingerprint).toMatch(/^fnv1a32:/u);
  expect(afterRecord?.surfaceFingerprint).not.toBe(beforeRecord?.surfaceFingerprint);
}

function expectGetFormRequest(request: Request, value: string) {
  const url = new URL(request.url());
  expect(request.method()).toBe("GET");
  expect(url.searchParams.get("query")).toBe(value);
  expect(url.searchParams.get("submitter")).toBe("get");
  expect(url.searchParams.has("ignored")).toBe(false);
}

function expectPostFormRequest(request: Request) {
  expect(request.method()).toBe("POST");
  expect(request.headers()["content-type"]).toContain("multipart/form-data; boundary=");
}

function expectPostFormProof(response: Response, value: string) {
  const headers = response.headers();
  expect(headers["x-interop-value"]).toBe(value);
  expect(headers["x-interop-file"]).toBe("interop-proof.txt");
  expect(headers["x-interop-submitter"]).toBe("post");
  expect(headers["x-interop-disabled"]).toBe("excluded");
}

async function nativePage(browser: Browser, host: "htmx" | "turbo", version: string) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${fixtureOrigin}/interop/${host}/${version}/start`);
  return { context, page };
}

test("native links and forms remain usable without JavaScript", async ({ browser }) => {
  for (const [host, version] of [
    ["turbo", turboVersions[0]],
    ["htmx", htmxVersions[0]],
  ] as const) {
    const { context, page } = await nativePage(browser, host, version);
    try {
      await page.locator(host === "turbo" ? "#document-link" : "#boost-link").click();
      await expect(page.locator("h1")).toContainText(host === "turbo" ? "next" : "boosted");

      await page.goto(`${fixtureOrigin}/interop/${host}/${version}/start`);
      await page.locator('#get-form input[name="query"]').fill("native-get");
      const getRequestPromise = page.waitForRequest(
        (request) =>
          request.method() === "GET" && new URL(request.url()).pathname.endsWith("/form"),
      );
      await page.locator("#get-form button").click();
      expectGetFormRequest(await getRequestPromise, "native-get");
      await expect(page).toHaveURL(/\/form\?/u);
      await expect(page.locator("h1")).toContainText("form");

      await page.goto(`${fixtureOrigin}/interop/${host}/${version}/start`);
      await page.locator('#post-form input[name="value"]').fill("native-post");
      await page.locator('#post-form input[type="file"]').setInputFiles({
        name: "interop-proof.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("interop-file"),
      });
      const postResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/form"),
      );
      const proofResponsePromise =
        host === "turbo"
          ? page.waitForResponse((response) => {
              const url = new URL(response.url());
              return (
                response.request().method() === "GET" &&
                url.pathname.endsWith("/next") &&
                url.searchParams.has("proof")
              );
            })
          : postResponsePromise;
      await page.locator("#post-form button").click();
      expectPostFormRequest((await postResponsePromise).request());
      expectPostFormProof(await proofResponsePromise, "native-post");
      await expect(page.locator("h1")).toContainText(host === "turbo" ? "next" : "form");
    } finally {
      await context.close();
    }
  }
});

test("Turbo document renders preserve identity and expose stable lifecycle order", async ({
  page,
}) => {
  for (const version of turboVersions) {
    await openHost(page, "turbo", version);
    await page.locator("#preserved-input").fill("typed-preserved-value");
    await page.locator("#preserved-input").focus();
    await page.evaluate(() => {
      const fixture = window as unknown as {
        __interopApplication: object | undefined;
        __preservedApplication: object | undefined;
        __preservedNode: Element | undefined;
        __turboBridgeJQuery: (target: Element) => {
          star(command: "instance"): object | undefined;
        };
      };
      fixture.__preservedNode = document.querySelector("#permanent") ?? undefined;
      fixture.__preservedApplication = fixture
        .__turboBridgeJQuery(document.querySelector("#permanent")!)
        .star("instance");
      fixture.__interopApplication = fixture
        .__turboBridgeJQuery(document.querySelector("#main")!)
        .star("instance");
    });
    const bridgeStart = await bridgeCount(page);
    await clearRecords(page);
    await page.locator("#document-link").click();
    await expect(page.locator("h1")).toHaveText("Turbo next");
    await waitForEvent(page, "turbo:load");

    const visitTrace = await records(page);
    expectOrdered(visitTrace, [
      "turbo:before-visit",
      "turbo:before-fetch-request",
      "turbo:before-fetch-response",
      "turbo:before-cache",
      "turbo:before-render",
      "turbo:render",
      "turbo:load",
    ]);
    expectRedacted(visitTrace);
    expectSurfaceChanged(visitTrace, "turbo:before-render", "turbo:render");
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __interopApplication?: { destroyed: boolean };
          __preservedApplication?: object;
          __preservedNode?: Element;
          __turboBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingOwned: Boolean(
            fixture.__turboBridgeJQuery(document.querySelector("#main")!).star("instance"),
          ),
          outgoingDestroyed: fixture.__interopApplication?.destroyed,
          preservedApplication:
            fixture.__preservedApplication ===
            fixture.__turboBridgeJQuery(document.querySelector("#permanent")!).star("instance"),
          preservedNode: fixture.__preservedNode === document.querySelector("#permanent"),
        };
      }),
    ).toEqual({
      incomingOwned: true,
      outgoingDestroyed: true,
      preservedApplication: true,
      preservedNode: true,
    });
    await expect(page.locator("#preserved-input")).toHaveValue("typed-preserved-value");
    await expect(page.locator("#preserved-input")).not.toBeFocused();
    const bridgeTrace = await bridgeRecords(page, bridgeStart);
    const documentRender = bridgeTrace.filter(
      ({ renderOperationId }) => renderOperationId !== null,
    );
    expect(documentRender.at(-1)).toMatchObject({
      flowId: "turbo.document.visit",
      outcome: "completed",
      phase: "committed",
      targetCategory: "document",
    });
    expect(new Set(documentRender.map(({ renderOperationId }) => renderOperationId)).size).toBe(1);
    expectBridgeRedacted(bridgeTrace);

    await clearRecords(page);
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("Turbo start");
    await waitForEvent(page, "turbo:load");
    const restoreTrace = await records(page);
    expectOrdered(restoreTrace, [
      "turbo:visit",
      "turbo:before-render",
      "turbo:render",
      "turbo:load",
    ]);
    expectRedacted(restoreTrace);
    expect(
      (await bridgeRecords(page)).some(({ flowId }) => flowId === "turbo.document.restore"),
    ).toBe(true);

    await clearRecords(page);
    await page.locator("#document-link").click();
    await expect(page.locator("h1")).toHaveText("Turbo next");
    await waitForEvent(page, "turbo:load");
    const repeatedTrace = await records(page);
    expectOrdered(repeatedTrace, ["turbo:before-render", "turbo:render", "turbo:load"]);
    const repeatedBeforeRenders = repeatedTrace.filter(
      ({ event }) => event === "turbo:before-render",
    );
    const repeatedRenders = repeatedTrace.filter(({ event }) => event === "turbo:render");
    expect(repeatedRenders.length).toBeGreaterThan(0);
    expect(repeatedRenders).toHaveLength(repeatedBeforeRenders.length);
    expect(repeatedTrace.filter(({ event }) => event === "turbo:load")).toHaveLength(1);
    expectRedacted(repeatedTrace);
  }
});

test("Turbo frames, cancellation, no-content, and failures keep distinct boundaries", async ({
  page,
}) => {
  for (const version of turboVersions) {
    await openHost(page, "turbo", version);
    await page.evaluate(() => {
      const fixture = window as unknown as {
        __frameApplication: object | undefined;
        __turboBridgeJQuery: (target: Element) => {
          star(command: "instance"): object | undefined;
        };
      };
      fixture.__frameApplication = fixture
        .__turboBridgeJQuery(document.querySelector("#frame-owner")!)
        .star("instance");
    });
    const bridgeStart = await bridgeCount(page);
    await clearRecords(page);
    await page.locator("#frame-link").click();
    await expect(page.locator("#frame-result")).toHaveText("Frame replaced");
    await waitForEvent(page, "turbo:frame-load");
    const frameTrace = await records(page);
    expectOrdered(frameTrace, [
      "turbo:before-frame-render",
      "turbo:frame-render",
      "turbo:frame-load",
    ]);
    expect(eventNames(frameTrace)).not.toContain("turbo:before-render");
    expectRedacted(frameTrace);
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __frameApplication?: { destroyed: boolean };
          __turboBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingOwned: Boolean(
            fixture.__turboBridgeJQuery(document.querySelector("#frame-result")!).star("instance"),
          ),
          outgoingDestroyed: fixture.__frameApplication?.destroyed,
        };
      }),
    ).toEqual({ incomingOwned: true, outgoingDestroyed: true });
    expect((await bridgeRecords(page, bridgeStart)).at(-1)).toMatchObject({
      flowId: "turbo.frame.replace",
      outcome: "completed",
      phase: "committed",
      targetCategory: "frame",
    });

    await openHost(page, "turbo", version);
    await clearRecords(page);
    await page.locator("#cancel-link").click();
    await expect(page).toHaveURL(new RegExp(`/interop/turbo/${version}/start$`, "u"));
    const canceledTrace = await records(page);
    expectOrdered(canceledTrace, ["turbo:click", "turbo:before-visit"]);
    expect(canceledTrace.find(({ event }) => event === "turbo:before-visit")?.outcome).toBe(
      "canceled",
    );
    expect(eventNames(canceledTrace)).not.toContain("turbo:before-render");
    expect((await bridgeRecords(page)).at(-1)).toMatchObject({
      flowId: "turbo.document.canceled",
      outcome: "canceled-before-mutation",
      renderOperationId: null,
    });

    const noContentStart = await bridgeCount(page);
    await clearRecords(page);
    await page.locator("#no-content-link").click();
    await waitForEvent(page, "turbo:before-fetch-response");
    const noContentTrace = await records(page);
    expectOrdered(noContentTrace, ["turbo:before-fetch-request", "turbo:before-fetch-response"]);
    expect(eventNames(noContentTrace)).not.toContain("turbo:before-render");
    expect((await bridgeRecords(page, noContentStart)).at(-1)).toMatchObject({
      flowId: "turbo.document.no-render",
      outcome: "observed-no-mutation",
      renderOperationId: null,
    });

    await openHost(page, "turbo", version);
    await clearRecords(page);
    await page.locator("#frame-missing-link").click();
    await waitForEvent(page, "turbo:frame-missing");
    const failureTrace = await records(page);
    expectOrdered(failureTrace, ["turbo:before-fetch-request", "turbo:frame-missing"]);
    expect(eventNames(failureTrace)).not.toContain("turbo:before-frame-render");
    expect((await bridgeRecords(page)).at(-1)).toMatchObject({
      flowId: "turbo.document.error",
      outcome: "failed-before-mutation",
      renderOperationId: null,
      targetCategory: "frame",
    });

    const networkPage = await page.context().newPage();
    try {
      await openHost(networkPage, "turbo", version);
      const networkBridge: BridgeObservation[] = [];
      await networkPage.exposeFunction(
        "recordTurboBridgeFailure",
        (observation: BridgeObservation) => networkBridge.push(observation),
      );
      await networkPage.evaluate(() => {
        const fixture = window as unknown as {
          __turboBridge: { observe(observer: (observation: BridgeObservation) => void): void };
          recordTurboBridgeFailure(observation: BridgeObservation): void;
        };
        fixture.__turboBridge.observe((observation) =>
          fixture.recordTurboBridgeFailure(observation),
        );
      });
      const failedRequestPromise = networkPage.waitForEvent("requestfailed", {
        predicate: (request) => new URL(request.url()).pathname.endsWith("/network-error"),
        timeout: 10_000,
      });
      await networkPage.locator("#network-error-link").click();
      const failedRequest = await failedRequestPromise;
      expect(failedRequest.failure()?.errorText).toBeTruthy();
      await expect
        .poll(() => networkBridge.at(-1))
        .toMatchObject({
          flowId: "turbo.document.error",
          outcome: "failed-before-mutation",
          renderOperationId: null,
        });
    } finally {
      await networkPage.close();
    }
  }
});

test("Turbo GET and POST forms retain host request and redirect ownership", async ({ page }) => {
  for (const version of turboVersions) {
    await openHost(page, "turbo", version);
    const getBridgeStart = await bridgeCount(page);
    await clearRecords(page);
    await page.locator('#get-form input[name="query"]').fill("");
    await page.locator("#get-form button").click();
    await expect(page.locator('#get-form input[name="query"]')).toBeFocused();
    expect(await records(page)).toEqual([]);
    await page.locator('#get-form input[name="query"]').fill("turbo-get");
    const getRequestPromise = page.waitForRequest(
      (request) => request.method() === "GET" && new URL(request.url()).pathname.endsWith("/form"),
    );
    await page.locator("#get-form button").click();
    expectGetFormRequest(await getRequestPromise, "turbo-get");
    await expect(page.locator("h1")).toHaveText("Turbo form");
    await waitForEvent(page, "turbo:load");
    const getTrace = await records(page);
    expectOrdered(getTrace, [
      "turbo:submit-start",
      "turbo:before-render",
      "turbo:render",
      "turbo:load",
    ]);
    expectBefore(getTrace, "turbo:submit-end", "turbo:before-render");
    expectBefore(getTrace, "turbo:before-visit", "turbo:before-render");
    expect((await bridgeRecords(page, getBridgeStart)).at(-1)).toMatchObject({
      flowId: "turbo.form.visit",
      outcome: "completed",
      phase: "committed",
    });

    await openHost(page, "turbo", version);
    const postBridgeStart = await bridgeCount(page);
    await clearRecords(page);
    await page.locator('#post-form input[name="value"]').fill("turbo-post");
    await page.locator('#post-form input[type="file"]').setInputFiles({
      name: "interop-proof.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("interop-file"),
    });
    const postResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/form"),
    );
    const proofResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname.endsWith("/next") &&
        url.searchParams.has("proof")
      );
    });
    await page.locator("#post-form button").click();
    expectPostFormRequest((await postResponsePromise).request());
    expectPostFormProof(await proofResponsePromise, "turbo-post");
    await expect(page.locator("h1")).toHaveText("Turbo next");
    await waitForEvent(page, "turbo:load");
    const postTrace = await records(page);
    expectOrdered(postTrace, [
      "turbo:submit-start",
      "turbo:before-render",
      "turbo:render",
      "turbo:load",
    ]);
    expectBefore(postTrace, "turbo:submit-end", "turbo:before-render");
    expectBefore(postTrace, "turbo:before-visit", "turbo:before-render");
    expectRedacted(postTrace);
    expect((await bridgeRecords(page, postBridgeStart)).at(-1)).toMatchObject({
      flowId: "turbo.form.visit",
      outcome: "completed",
      phase: "committed",
    });
  }
});

test("htmx replacement and insertion modes expose stable public event order", async ({ page }) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version);
    await page.locator("#region-preserved input").fill("retained-region-value");
    await page.locator("#region-preserved input").focus();
    await page.evaluate(() => {
      (window as unknown as { __preservedNode: Element | undefined }).__preservedNode =
        document.querySelector("#region-preserved") ?? undefined;
    });
    await clearRecords(page);
    await page.locator("#inner-swap").click();
    await expect(page.locator("#inner-result")).toHaveText("Inner replaced");
    await waitForEvent(page, "htmx:afterSettle");
    const innerTrace = await records(page);
    expectOrdered(innerTrace, [
      "htmx:beforeRequest",
      "htmx:beforeSwap",
      "htmx:beforeCleanupElement",
      "htmx:afterSwap",
      "htmx:afterRequest",
      "htmx:afterSettle",
    ]);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __preservedNode: Element | undefined }).__preservedNode ===
          document.querySelector("#region-preserved"),
      ),
    ).toBe(true);
    await expect(page.locator("#region-preserved input")).toHaveValue("retained-region-value");
    await expect(page.locator("#region-preserved input")).not.toBeFocused();
    expectRedacted(innerTrace);
    expectSurfaceChanged(innerTrace, "htmx:beforeSwap", "htmx:afterSwap");
    expect(
      innerTrace
        .filter(({ event }) => event === "htmx:beforeCleanupElement")
        .map(({ targetKey }) => targetKey),
    ).toEqual(expect.arrayContaining(["nested-owner", "nested-cleanup", "nested-child"]));

    await page.locator("#region-preserved input").fill("repeated-retained-value");
    const repeatedPreserved = await page.locator("#region-preserved").elementHandle();
    await clearRecords(page);
    await page.locator("#inner-swap").click();
    await expect(page.locator("#inner-result")).toHaveText("Inner replaced");
    await waitForEvent(page, "htmx:afterSettle");
    const repeatedTrace = await records(page);
    expect(repeatedTrace.filter(({ event }) => event === "htmx:afterSwap")).toHaveLength(1);
    expect(
      await page.evaluate(
        (preserved) => preserved === document.querySelector("#region-preserved"),
        repeatedPreserved,
      ),
    ).toBe(true);
    await expect(page.locator("#region-preserved input")).toHaveValue("repeated-retained-value");
    expectRedacted(repeatedTrace);

    for (const [trigger, result, cleanup] of [
      ["#append-swap", ".added-item", false],
      ["#prepend-swap", ".added-item", false],
      ["#before-swap", ".adjacent-result", false],
      ["#after-swap", ".adjacent-result", false],
    ] as const) {
      await clearRecords(page);
      const beforeCount = await page.locator(result).count();
      await page.locator(trigger).click();
      if (cleanup) await expect(page.locator(result)).toHaveCount(0);
      else await expect(page.locator(result)).toHaveCount(beforeCount + 1);
      await waitForEvent(page, "htmx:afterSettle");
      const insertionTrace = await records(page);
      expectOrdered(insertionTrace, ["htmx:beforeSwap", "htmx:afterSwap", "htmx:afterSettle"]);
      if (!cleanup) expect(eventNames(insertionTrace)).not.toContain("htmx:beforeCleanupElement");
    }

    await clearRecords(page);
    await page.locator("#delete-swap").click();
    await expect(page.locator("#delete-target")).toHaveCount(0);
    await waitForEvent(page, "htmx:afterRequest");
    const deleteTrace = await records(page);
    expectOrdered(deleteTrace, [
      "htmx:beforeSwap",
      "htmx:beforeCleanupElement",
      "htmx:afterRequest",
    ]);
    expect(eventNames(deleteTrace)).not.toContain("htmx:afterSwap");
    expect(eventNames(deleteTrace)).not.toContain("htmx:afterSettle");

    await openHost(page, "htmx", version);
    await clearRecords(page);
    await page.locator("#outer-swap").click();
    await expect(page.locator("#outer-result")).toHaveText("Outer replaced");
    await waitForEvent(page, "htmx:afterSettle");
    expectOrdered(await records(page), [
      "htmx:beforeSwap",
      "htmx:beforeCleanupElement",
      "htmx:afterSwap",
      "htmx:afterSettle",
    ]);
  }
});

test("htmx OOB, no-swap, cancellation, and errors remain separately observable", async ({
  page,
}) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version);
    await clearRecords(page);
    await page.locator("#oob-swap").click();
    await expect(page.locator("#oob-main")).toHaveText("Main replacement");
    await expect(page.locator("#oob-target")).toHaveText("New out-of-band content");
    await waitForEvent(page, "htmx:afterSettle");
    expectOrdered(await records(page), [
      "htmx:oobBeforeSwap",
      "htmx:oobAfterSwap",
      "htmx:afterSwap",
      "htmx:afterSettle",
    ]);

    await openHost(page, "htmx", version);
    await clearRecords(page);
    await page.locator("#none-swap").click();
    await waitForEvent(page, "htmx:afterRequest");
    const noneTrace = await records(page);
    expectOrdered(noneTrace, ["htmx:beforeSwap", "htmx:afterRequest"]);
    expect(eventNames(noneTrace)).not.toContain("htmx:beforeCleanupElement");
    expect(eventNames(noneTrace)).toContain("htmx:afterSwap");

    await clearRecords(page);
    await page.locator("#cancel-swap").click();
    await waitForEvent(page, "htmx:afterRequest");
    const cancelTrace = await records(page);
    expect(cancelTrace.find(({ event }) => event === "htmx:beforeSwap")?.outcome).toBe("canceled");
    expect(eventNames(cancelTrace)).not.toContain("htmx:beforeCleanupElement");

    await clearRecords(page);
    await page.locator("#no-content").click();
    await waitForEvent(page, "htmx:afterRequest");
    const noContentTrace = await records(page);
    expect(eventNames(noContentTrace)).not.toContain("htmx:beforeCleanupElement");
    expect(eventNames(noContentTrace)).not.toContain("htmx:afterSwap");

    await clearRecords(page);
    await page.locator("#response-error").click();
    await waitForEvent(page, "htmx:responseError");
    const responseErrorTrace = await records(page);
    expectOrdered(responseErrorTrace, [
      "htmx:beforeRequest",
      "htmx:responseError",
      "htmx:afterRequest",
    ]);
    expect(eventNames(responseErrorTrace)).not.toContain("htmx:beforeCleanupElement");

    await clearRecords(page);
    await page.locator("#network-error").click();
    await waitForEvent(page, "htmx:sendError");
    const networkErrorTrace = await records(page);
    expectOrdered(networkErrorTrace, ["htmx:beforeRequest", "htmx:afterRequest", "htmx:sendError"]);
    expectRedacted(networkErrorTrace);

    await clearRecords(page);
    await page.locator("#swap-error").click();
    await waitForEvent(page, "htmx:swapError");
    const swapErrorTrace = await records(page);
    expectOrdered(swapErrorTrace, ["htmx:beforeSwap", "htmx:swapError"]);
    expect(eventNames(swapErrorTrace)).not.toContain("htmx:afterSwap");
    expectRedacted(swapErrorTrace);

    await clearRecords(page);
    await page.locator("#target-error").click();
    await waitForEvent(page, "htmx:targetError");
    const targetErrorTrace = await records(page);
    expect(eventNames(targetErrorTrace)).toContain("htmx:targetError");
    expect(eventNames(targetErrorTrace)).not.toContain("htmx:beforeRequest");
    expect(eventNames(targetErrorTrace)).not.toContain("htmx:beforeCleanupElement");
  }
});

test("htmx forms, boosted navigation, and history stay host-owned", async ({ page }) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version);
    await clearRecords(page);
    await page.locator('#get-form input[name="query"]').fill("");
    await page.locator("#get-form button").click();
    await expect(page.locator('#get-form input[name="query"]')).toBeFocused();
    expect(await records(page)).toEqual([]);
    await page.locator('#get-form input[name="query"]').fill("htmx-get");
    const getRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "GET" && new URL(request.url()).pathname.endsWith("/fragment/form"),
    );
    await page.locator("#get-form button").click();
    expectGetFormRequest(await getRequestPromise, "htmx-get");
    await expect(page.locator("#form-response")).toHaveText("Submitted");
    await waitForEvent(page, "htmx:afterSettle");
    expectOrdered(await records(page), [
      "htmx:beforeRequest",
      "htmx:beforeSwap",
      "htmx:afterSwap",
      "htmx:afterRequest",
      "htmx:afterSettle",
    ]);

    await clearRecords(page);
    await page.locator('#post-form input[name="value"]').fill("htmx-post");
    await page.locator('#post-form input[type="file"]').setInputFiles({
      name: "interop-proof.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("interop-file"),
    });
    const postResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/fragment/form"),
    );
    await page.locator("#post-form button").click();
    const postResponse = await postResponsePromise;
    expectPostFormRequest(postResponse.request());
    expectPostFormProof(postResponse, "htmx-post");
    await expect(page.locator("#form-response")).toHaveText("Submitted");
    await waitForEvent(page, "htmx:afterSettle");
    expectRedacted(await records(page));

    await clearRecords(page);
    await page.locator("#boost-link").click();
    await expect(page.locator("#boosted-result")).toHaveText("Boosted document");
    await expect(page).toHaveURL(new RegExp(`/interop/htmx/${version}/boosted$`, "u"));
    await waitForEvent(page, "htmx:afterSettle");
    const boostTrace = await records(page);
    expectOrdered(boostTrace, [
      "htmx:beforeRequest",
      "htmx:beforeSwap",
      "htmx:beforeHistorySave",
      "htmx:beforeCleanupElement",
      "htmx:afterSwap",
      "htmx:afterSettle",
    ]);

    await clearRecords(page);
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("htmx start");
    await waitForEvent(page, "htmx:historyRestore");
    const restoreTrace = await records(page);
    expect(eventNames(restoreTrace)).toContain("htmx:historyRestore");
    expectRedacted(restoreTrace);
  }
});

test("htmx bridge preserves, releases, and enhances every approved swap boundary", async ({
  page,
}) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version, true);
    await page.locator("#region-preserved input").fill("bridge-retained-value");
    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeNestedApplications?: Array<{ destroyed: boolean }>;
        __bridgePreservedApplication?: object;
        __bridgePreservedNode?: Element;
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      const preserved = document.querySelector("#region-preserved")!;
      fixture.__bridgePreservedNode = preserved;
      fixture.__bridgePreservedApplication = fixture
        .__htmxBridgeJQuery(preserved)
        .star("instance")!;
      fixture.__bridgeNestedApplications = [
        "#nested-owner",
        "#nested-cleanup",
        "#nested-child",
      ].map((selector) =>
        fixture.__htmxBridgeJQuery(document.querySelector(selector)!).star("instance")!,
      );
    });
    const innerStart = await htmxBridgeCount(page);
    await page.locator("#inner-swap").click();
    await expect(page.locator("#inner-result")).toHaveText("Inner replaced");
    await waitForEvent(page, "htmx:afterSettle");
    const innerBridge = await htmxBridgeRecords(page, innerStart);

    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __bridgeNestedApplications: Array<{ destroyed: boolean }>;
          __bridgePreservedApplication: object;
          __bridgePreservedNode: Element;
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        const preserved = document.querySelector("#region-preserved")!;
        return {
          incomingOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#inner-result")!).star("instance"),
          ),
          nestedDestroyed: fixture.__bridgeNestedApplications.map(({ destroyed }) => destroyed),
          preservedApplication:
            fixture.__bridgePreservedApplication ===
            fixture.__htmxBridgeJQuery(preserved).star("instance"),
          preservedNode: fixture.__bridgePreservedNode === preserved,
        };
      }),
    ).toEqual({
      incomingOwned: true,
      nestedDestroyed: [true, true, true],
      preservedApplication: true,
      preservedNode: true,
    });
    await expect(page.locator("#region-preserved input")).toHaveValue("bridge-retained-value");
    const innerTerminal = innerBridge.filter(({ phase }) => phase === "committed");
    expect(innerTerminal).toHaveLength(1);
    expect(innerTerminal[0]).toMatchObject({
      eventId: "htmx:afterSettle",
      flowId: "htmx.swap.inner",
      outcome: "completed",
      swapStyle: "innerHTML",
      targetCategory: "region",
    });
    expect(new Set(innerBridge.map(({ bridgeOperationId }) => bridgeOperationId)).size).toBe(1);
    expectHtmxBridgeRedacted(innerBridge);

    for (const [trigger, result, style] of [
      ["#append-swap", ".added-item", "beforeend"],
      ["#prepend-swap", ".added-item", "afterbegin"],
      ["#before-swap", ".adjacent-result", "beforebegin"],
      ["#after-swap", ".adjacent-result", "afterend"],
    ] as const) {
      const bridgeStart = await htmxBridgeCount(page);
      const beforeCount = await page.locator(result).count();
      await page.locator(trigger).click();
      await expect(page.locator(result)).toHaveCount(beforeCount + 1);
      await waitForEvent(page, "htmx:afterSettle");
      const bridgeTrace = await htmxBridgeRecords(page, bridgeStart);
      expect(
        await page.locator(`${result}[data-jqs]`).evaluateAll((roots) =>
          roots.every((root) =>
            Boolean(
              (
                window as unknown as {
                  __htmxBridgeJQuery: (target: Element) => {
                    star(command: "instance"): object | undefined;
                  };
                }
              )
                .__htmxBridgeJQuery(root)
                .star("instance"),
            ),
          ),
        ),
      ).toBe(true);
      expect(bridgeTrace.filter(({ phase }) => phase === "committed")).toEqual([
        expect.objectContaining({
          eventId: "htmx:afterSettle",
          flowId: "htmx.swap.adjacent",
          outcome: "completed",
          removalCount: 0,
          swapStyle: style,
        }),
      ]);
    }

    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeOuterApplication?: { destroyed: boolean };
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      fixture.__bridgeOuterApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#inner-result")!)
        .star("instance")!;
    });
    const outerStart = await htmxBridgeCount(page);
    await page.locator("#outer-swap").click();
    await expect(page.locator("#outer-result")).toHaveText("Outer replaced");
    await waitForEvent(page, "htmx:afterSettle");
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __bridgeOuterApplication: { destroyed: boolean };
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#outer-result")!).star("instance"),
          ),
          outgoingDestroyed: fixture.__bridgeOuterApplication.destroyed,
        };
      }),
    ).toEqual({ incomingOwned: true, outgoingDestroyed: true });
    expect((await htmxBridgeRecords(page, outerStart)).at(-1)).toMatchObject({
      eventId: "htmx:afterSettle",
      flowId: "htmx.swap.outer",
      outcome: "completed",
      swapStyle: "outerHTML",
    });

    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeDeleteApplication?: { destroyed: boolean };
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      fixture.__bridgeDeleteApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#delete-target")!)
        .star("instance")!;
    });
    const deleteStart = await htmxBridgeCount(page);
    await page.locator("#delete-swap").click();
    await expect(page.locator("#delete-target")).toHaveCount(0);
    await waitForEvent(page, "htmx:afterRequest");
    const deleteBridge = await htmxBridgeRecords(page, deleteStart);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __bridgeDeleteApplication: { destroyed: boolean } })
            .__bridgeDeleteApplication.destroyed,
      ),
    ).toBe(true);
    expect(deleteBridge.filter(({ phase }) => phase === "committed")).toEqual([
      expect.objectContaining({
        eventId: "htmx:afterRequest",
        flowId: "htmx.swap.delete",
        outcome: "completed",
        swapStyle: "delete",
      }),
    ]);
  }
});

test("htmx bridge separates OOB, no-mutation, error, and disposal outcomes", async ({ page }) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version, true);
    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeMainApplication?: { destroyed: boolean };
        __bridgeOobApplication?: { destroyed: boolean };
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      fixture.__bridgeMainApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#nested-owner")!)
        .star("instance")!;
      fixture.__bridgeOobApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#oob-target")!)
        .star("instance")!;
    });
    const oobStart = await htmxBridgeCount(page);
    await page.locator("#oob-swap").click();
    await expect(page.locator("#oob-main")).toHaveText("Main replacement");
    await expect(page.locator("#oob-target")).toHaveText("New out-of-band content");
    await waitForEvent(page, "htmx:afterSettle");
    const oobBridge = await htmxBridgeRecords(page, oobStart);
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __bridgeMainApplication: { destroyed: boolean };
          __bridgeOobApplication: { destroyed: boolean };
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingMainOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#oob-main")!).star("instance"),
          ),
          incomingOobOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#oob-target")!).star("instance"),
          ),
          mainDestroyed: fixture.__bridgeMainApplication.destroyed,
          oobDestroyed: fixture.__bridgeOobApplication.destroyed,
        };
      }),
    ).toEqual({
      incomingMainOwned: true,
      incomingOobOwned: true,
      mainDestroyed: true,
      oobDestroyed: true,
    });
    const oobTerminal = oobBridge.filter(({ phase }) => phase === "committed");
    expect(oobTerminal.map(({ flowId }) => flowId).sort()).toEqual([
      "htmx.swap.inner",
      "htmx.swap.oob",
    ]);
    expect(new Set(oobTerminal.map(({ bridgeOperationId }) => bridgeOperationId)).size).toBe(2);
    expectHtmxBridgeRedacted(oobBridge);

    for (const [trigger, terminalEvent, expected] of [
      [
        "#none-swap",
        "htmx:afterRequest",
        {
          eventId: "htmx:afterRequest",
          flowId: "htmx.swap.none",
          outcome: "observed-no-mutation",
          phase: "committed",
          renderOperationId: null,
        },
      ],
      [
        "#cancel-swap",
        "htmx:afterRequest",
        {
          eventId: "htmx:beforeSwap",
          flowId: "htmx.swap.inner",
          outcome: "canceled-before-mutation",
          phase: "canceled",
        },
      ],
      [
        "#no-content",
        "htmx:afterRequest",
        {
          eventId: "htmx:afterRequest",
          flowId: "htmx.swap.none",
          outcome: "observed-no-mutation",
          phase: "committed",
          renderOperationId: null,
        },
      ],
      [
        "#response-error",
        "htmx:responseError",
        {
          eventId: "htmx:responseError",
          flowId: "htmx.request.error",
          outcome: "failed-before-mutation",
          phase: "failed",
          renderOperationId: null,
        },
      ],
      [
        "#network-error",
        "htmx:sendError",
        {
          eventId: "htmx:sendError",
          flowId: "htmx.request.error",
          outcome: "failed-before-mutation",
          phase: "failed",
          renderOperationId: null,
        },
      ],
      [
        "#swap-error",
        "htmx:swapError",
        {
          eventId: "htmx:swapError",
          flowId: "htmx.swap.inner",
          phase: "failed",
        },
      ],
      [
        "#target-error",
        "htmx:targetError",
        {
          eventId: "htmx:targetError",
          flowId: "htmx.request.error",
          outcome: "failed-before-mutation",
          phase: "failed",
          renderOperationId: null,
        },
      ],
    ] as const) {
      const start = await htmxBridgeCount(page);
      await clearRecords(page);
      await page.locator(trigger).click();
      await waitForEvent(page, terminalEvent);
      const bridgeTrace = await htmxBridgeRecords(page, start);
      expect(bridgeTrace.at(-1)).toMatchObject(expected);
      expectHtmxBridgeRedacted(bridgeTrace);
    }

    await openHost(page, "htmx", version, true);
    const disposal = await page.evaluate(async () => {
      const fixture = window as unknown as {
        __htmxBridge: {
          dispose(): Promise<{
            attempted: number;
            preparedReleased: number;
            remaining: number;
            schema: string;
          }>;
          observations(): HtmxBridgeObservation[];
        };
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
        htmx: object;
      };
      const host = fixture.htmx;
      const existing = fixture
        .__htmxBridgeJQuery(document.querySelector("#delete-target")!)
        .star("instance")!;
      const observations = fixture.__htmxBridge.observations().length;
      const first = fixture.__htmxBridge.dispose();
      const second = fixture.__htmxBridge.dispose();
      return {
        existingDestroyed: existing.destroyed,
        hostRetained: host === fixture.htmx,
        observations,
        report: await first,
        samePromise: first === second,
      };
    });
    expect(disposal).toEqual({
      existingDestroyed: false,
      hostRetained: true,
      observations: 0,
      report: {
        attempted: 0,
        preparedReleased: 0,
        remaining: 0,
        schema: "jqstar-htmx-bridge-disposal/1",
      },
      samePromise: true,
    });
    await page.locator("#append-swap").click();
    await expect(page.locator(".added-item")).toHaveCount(1);
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __htmxBridge: { observations(): HtmxBridgeObservation[] };
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector(".added-item")!).star("instance"),
          ),
          observations: fixture.__htmxBridge.observations().length,
        };
      }),
    ).toEqual({ incomingOwned: false, observations: 0 });
  }
});

test("htmx bridge keeps forms, boosted visits, focus, and history host-owned", async ({ page }) => {
  for (const version of htmxVersions) {
    await openHost(page, "htmx", version, true);
    await page.locator('#get-form input[name="query"]').fill("");
    const validationStart = await htmxBridgeCount(page);
    await page.locator("#get-form button").click();
    await expect(page.locator('#get-form input[name="query"]')).toBeFocused();
    expect(await htmxBridgeCount(page)).toBe(validationStart);

    await page.locator('#get-form input[name="query"]').fill("bridge-get");
    const getStart = await htmxBridgeCount(page);
    const getRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "GET" && new URL(request.url()).pathname.endsWith("/fragment/form"),
    );
    await page.locator("#get-form button").click();
    expectGetFormRequest(await getRequestPromise, "bridge-get");
    await expect(page.locator("#form-response")).toHaveText("Submitted");
    await waitForEvent(page, "htmx:afterSettle");
    expect(
      await page.evaluate(() =>
        Boolean(
          (
            window as unknown as {
              __htmxBridgeJQuery: (target: Element) => {
                star(command: "instance"): object | undefined;
              };
            }
          )
            .__htmxBridgeJQuery(document.querySelector("#form-response")!)
            .star("instance"),
        ),
      ),
    ).toBe(true);
    expect((await htmxBridgeRecords(page, getStart)).at(-1)).toMatchObject({
      flowId: "htmx.swap.inner",
      outcome: "completed",
      phase: "committed",
    });

    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeFormApplication?: { destroyed: boolean };
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      fixture.__bridgeFormApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#form-response")!)
        .star("instance")!;
    });
    await page.locator('#post-form input[name="value"]').fill("bridge-post");
    await page.locator('#post-form input[type="file"]').setInputFiles({
      name: "interop-proof.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("interop-file"),
    });
    const postStart = await htmxBridgeCount(page);
    const postResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/fragment/form"),
    );
    await page.locator("#post-form button").click();
    const postResponse = await postResponsePromise;
    expectPostFormRequest(postResponse.request());
    expectPostFormProof(postResponse, "bridge-post");
    await expect(page.locator("#form-response")).toHaveText("Submitted");
    await waitForEvent(page, "htmx:afterSettle");
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __bridgeFormApplication: { destroyed: boolean };
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        return {
          incomingOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#form-response")!).star("instance"),
          ),
          outgoingDestroyed: fixture.__bridgeFormApplication.destroyed,
        };
      }),
    ).toEqual({ incomingOwned: true, outgoingDestroyed: true });
    expect((await htmxBridgeRecords(page, postStart)).at(-1)).toMatchObject({
      flowId: "htmx.swap.inner",
      outcome: "completed",
      phase: "committed",
    });

    await page.evaluate(() => {
      const fixture = window as unknown as {
        __bridgeBoostApplication?: { destroyed: boolean };
        __bridgeHeaderApplication?: object;
        __bridgeHeaderNode?: Element;
        __htmxBridgeJQuery: (target: Element) => {
          star(command: "instance"): { destroyed: boolean } | undefined;
        };
      };
      const header = document.querySelector("#permanent")!;
      fixture.__bridgeHeaderNode = header;
      fixture.__bridgeHeaderApplication = fixture.__htmxBridgeJQuery(header).star("instance")!;
      fixture.__bridgeBoostApplication = fixture
        .__htmxBridgeJQuery(document.querySelector("#form-response")!)
        .star("instance")!;
    });
    const boostStart = await htmxBridgeCount(page);
    await page.locator("#boost-link").click();
    await expect(page.locator("#boosted-result")).toHaveText("Boosted document");
    await expect(page).toHaveURL(new RegExp(`/interop/htmx/${version}/boosted$`, "u"));
    await waitForEvent(page, "htmx:afterSettle");
    expect(
      await page.evaluate(() => {
        const fixture = window as unknown as {
          __bridgeBoostApplication: { destroyed: boolean };
          __bridgeHeaderApplication: object;
          __bridgeHeaderNode: Element;
          __htmxBridgeJQuery: (target: Element) => {
            star(command: "instance"): object | undefined;
          };
        };
        const header = document.querySelector("#permanent")!;
        return {
          boostOwned: Boolean(
            fixture.__htmxBridgeJQuery(document.querySelector("#boosted-result")!).star("instance"),
          ),
          headerApplication:
            fixture.__bridgeHeaderApplication ===
            fixture.__htmxBridgeJQuery(header).star("instance"),
          headerNode: fixture.__bridgeHeaderNode === header,
          outgoingDestroyed: fixture.__bridgeBoostApplication.destroyed,
        };
      }),
    ).toEqual({
      boostOwned: true,
      headerApplication: true,
      headerNode: true,
      outgoingDestroyed: true,
    });
    expect((await htmxBridgeRecords(page, boostStart)).at(-1)).toMatchObject({
      eventId: "htmx:afterSettle",
      flowId: "htmx.document.boost",
      outcome: "completed",
      phase: "committed",
      targetCategory: "document",
    });

    const historyStart = await htmxBridgeCount(page);
    await clearRecords(page);
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("htmx start");
    await waitForEvent(page, "htmx:historyRestore");
    const historyHostTrace = await records(page);
    const historyHostEvents = eventNames(historyHostTrace);
    expect(historyHostEvents).toContain("htmx:beforeHistorySave");
    if (version === "2.0.0") {
      expect(historyHostEvents).not.toContain("htmx:historyCacheHit");
      expect(historyHostEvents).toContain("htmx:beforeCleanupElement");
    } else {
      expect(
        historyHostEvents.find(
          (event) => event === "htmx:historyCacheHit" || event === "htmx:historyCacheMissLoad",
        ),
        historyHostEvents.join(", "),
      ).toBeDefined();
    }
    const historyBridge = await htmxBridgeRecords(page, historyStart);
    expect(historyBridge.filter(({ phase }) => phase === "committed")).toEqual([
      expect.objectContaining({
        eventId: "htmx:historyRestore",
        flowId: "htmx.history.restore",
        outcome: "completed",
        targetCategory: "history",
      }),
    ]);
    expect(
      await page.evaluate(() =>
        Boolean(
          (
            window as unknown as {
              __htmxBridgeJQuery: (target: Element) => {
                star(command: "instance"): object | undefined;
              };
            }
          )
            .__htmxBridgeJQuery(document.querySelector("#nested-owner")!)
            .star("instance"),
        ),
      ),
    ).toBe(true);
    expectHtmxBridgeRedacted(historyBridge);
  }
});

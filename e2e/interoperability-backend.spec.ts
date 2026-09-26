import { expect, test } from "@playwright/test";
import type { Page, Response } from "@playwright/test";

const origin = "http://127.0.0.1:4175";

interface NativeRemoval {
  method: string;
  destroyedBefore: boolean;
}

type ProbeWindow = Window &
  typeof globalThis & {
    __interopBackend?: object;
    __oldBackend: HTMLElement;
    __oldInstance: { destroyed: boolean };
    __oldLifecycle: string[];
    __incomingLifecycle: string[];
    __preserved: HTMLElement;
    __nativeRemoval: NativeRemoval[];
    __turboBridge?: { whenIdle(): Promise<void> };
    __htmxBridge?: { whenIdle(): Promise<void> };
    __turboBridgeJQuery?: (target: Element) => {
      star(command: "instance"): { destroyed: boolean; state: Record<string, unknown> } | undefined;
      on(event: string, listener: (event: { detail?: { type: string } }) => void): void;
    };
    __htmxBridgeJQuery?: (target: Element) => {
      star(command: "instance"): { destroyed: boolean; state: Record<string, unknown> } | undefined;
      on(event: string, listener: (event: { detail?: { type: string } }) => void): void;
    };
  };

async function requestFor(
  page: Page,
  path: string,
  activate: () => Promise<void>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname === path),
    activate(),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

async function exerciseBackend(
  page: Page,
  host: string,
  version: string,
  phase: "outgoing" | "incoming",
): Promise<void> {
  const rootId = `#${phase}-backend`;
  const count = phase === "outgoing" ? 7 : 27;
  const streamCount = phase === "outgoing" ? 11 : 31;
  const base = `/interop/${host}/${version}/backend`;
  await expect(page.locator(`${rootId} [data-part=count]`)).toHaveText(
    phase === "outgoing" ? "1" : "21",
  );
  await page.evaluate(
    ({ host, phase }) => {
      const owner = window as ProbeWindow;
      const root = document.querySelector(`#${phase}-backend`);
      const jquery = owner[host === "turbo" ? "__turboBridgeJQuery" : "__htmxBridgeJQuery"];
      if (!root || !jquery) throw new Error("The backend application is missing.");
      const events: string[] = [];
      if (phase === "outgoing") owner.__oldLifecycle = events;
      else owner.__incomingLifecycle = events;
      jquery(root).on("jquery-star:fetch", (event) => {
        if (event.detail) events.push(event.detail.type);
      });
    },
    { host, phase },
  );

  const json = await requestFor(page, `${base}/json`, () =>
    page.locator(`${rootId} [data-part=json]`).click(),
  );
  const genericHeaders = await json.request().allHeaders();
  expect(genericHeaders["datastar-request"]).toBeUndefined();
  expect(genericHeaders.accept).not.toContain("text/event-stream");
  expect(new URL(json.url()).searchParams.has("datastar")).toBe(false);
  expect(new URL(json.url()).searchParams.get("phase")).toBe(phase);
  await expect(page.locator(`${rootId} [data-part=count]`)).toHaveText(String(count));

  const html = await requestFor(page, `${base}/html`, () =>
    page.locator(`${rootId} [data-part=html]`).click(),
  );
  expect((await html.request().allHeaders())["datastar-request"]).toBeUndefined();
  expect(new URL(html.url()).searchParams.has("datastar")).toBe(false);
  await expect(page.locator(`${rootId} [data-part=html-phase]`)).toHaveText(phase);
  await page.locator(`${rootId} [data-part=inserted]`).click();
  await expect(page.locator(`${rootId} [data-part=count]`)).toHaveText(String(count + 1));

  const sse = await requestFor(page, `${base}/sse`, () =>
    page.locator(`${rootId} [data-part=sse]`).click(),
  );
  const sseHeaders = await sse.request().allHeaders();
  expect(sseHeaders["datastar-request"]).toBe("true");
  expect(sseHeaders.accept).toContain("text/event-stream");
  expect(sse.headers()["content-type"]).toContain("text/event-stream");
  expect(JSON.parse(new URL(sse.url()).searchParams.get("datastar") ?? "null")).toMatchObject({
    count: count + 1,
  });
  await expect(page.locator(`${rootId} [data-part=count]`)).toHaveText(String(streamCount));
  await expect(page.locator(`${rootId} [data-part=sse-phase]`)).toHaveText(phase);
  await page.locator(`${rootId} [data-part=streamed]`).click();
  await expect(page.locator(`${rootId} [data-part=count]`)).toHaveText(String(streamCount + 1));

  await page.waitForFunction((phase) => {
    const owner = window as ProbeWindow;
    const events = phase === "outgoing" ? owner.__oldLifecycle : owner.__incomingLifecycle;
    return events.filter((event) => event === "finished").length === 3;
  }, phase);
  const lifecycle = await page.evaluate(
    (phase) =>
      phase === "outgoing"
        ? (window as ProbeWindow).__oldLifecycle
        : (window as ProbeWindow).__incomingLifecycle,
    phase,
  );
  expect(lifecycle.filter((event) => event === "started")).toHaveLength(3);
  expect(lifecycle.filter((event) => event === "finished")).toHaveLength(3);
  expect(lifecycle).not.toContain("error");
}

for (const [host, version, trigger, preserved] of [
  ["turbo", "8.0.21", "#document-link", "#permanent"],
  ["turbo", "8.0.23", "#document-link", "#permanent"],
  ["htmx", "2.0.0", "#inner-swap", "#region-preserved"],
  ["htmx", "2.0.10", "#inner-swap", "#region-preserved"],
] as const) {
  for (const nested of [false, true]) {
    test(`${host} ${version} ${nested ? "nested" : "single"} retains generic and SDK backend ownership across host replacement`, async ({
      page,
    }) => {
      const backendRequests: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.includes("/backend/"))
          backendRequests.push(request.url());
      });
      await page.goto(
        `${origin}/interop/${host}/${version}/start?bridge=1&backend=1${nested ? "&nested=1" : ""}`,
      );
      await page.waitForFunction((host) => {
        const owner = window as ProbeWindow;
        return (
          !!owner.__interopBackend && !!owner[host === "turbo" ? "__turboBridge" : "__htmxBridge"]
        );
      }, host);
      if (nested) {
        const outer = await page.evaluate((host) => {
          const owner = window as ProbeWindow;
          const root = document.querySelector(host === "turbo" ? "#main" : "#region");
          const jquery = owner[host === "turbo" ? "__turboBridgeJQuery" : "__htmxBridgeJQuery"];
          return root && jquery?.(root).star("instance")?.state;
        }, host);
        expect(outer).toEqual({ outer: 100 });
      }
      await exerciseBackend(page, host, version, "outgoing");
      expect(backendRequests).toHaveLength(3);
      expect(await page.locator("body").getAttribute("data-route")).toBe("start");

      await page.evaluate(
        ({ host, preserved }) => {
          const owner = window as ProbeWindow;
          const root = document.querySelector<HTMLElement>("#outgoing-backend");
          const neighbor = document.querySelector<HTMLElement>(preserved);
          const jquery = owner[host === "turbo" ? "__turboBridgeJQuery" : "__htmxBridgeJQuery"];
          if (!root || !neighbor || !jquery)
            throw new Error("The backend host fixture is incomplete.");
          const instance = jquery(root).star("instance");
          if (!instance) throw new Error("The outgoing backend application did not start.");
          owner.__oldBackend = root;
          owner.__oldInstance = instance;
          owner.__preserved = neighbor;
          const input = neighbor.querySelector("input");
          if (!input) throw new Error("The preserved input is missing.");
          input.value = "retained-value";
          const removal: NativeRemoval[] = [];
          owner.__nativeRemoval = removal;
          const record = (method: string, connectedBefore: boolean, destroyedBefore: boolean) => {
            if (connectedBefore && !root.isConnected && removal.length === 0)
              removal.push({ method, destroyedBefore });
          };
          const watch = (prototype: object, method: string) => {
            const original = (prototype as Record<string, (...args: unknown[]) => unknown>)[method];
            if (typeof original !== "function") throw new Error(`Missing native ${method}.`);
            Object.defineProperty(prototype, method, {
              configurable: true,
              writable: true,
              value: function (this: unknown, ...args: unknown[]) {
                const connectedBefore = root.isConnected;
                const destroyedBefore = instance.destroyed;
                const result = Reflect.apply(original, this, args);
                record(method, connectedBefore, destroyedBefore);
                return result;
              },
            });
          };
          for (const method of ["removeChild", "replaceChild"]) watch(Node.prototype, method);
          for (const method of ["remove", "replaceWith", "replaceChildren"])
            watch(Element.prototype, method);
          for (const name of ["innerHTML", "outerHTML"]) {
            const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, name);
            const set = descriptor?.set;
            if (!set) continue;
            Object.defineProperty(Element.prototype, name, {
              configurable: true,
              ...(descriptor.get ? { get: descriptor.get } : {}),
              set(this: Element, value: string) {
                const connectedBefore = root.isConnected;
                const destroyedBefore = instance.destroyed;
                Reflect.apply(set, this, [value]);
                record(name, connectedBefore, destroyedBefore);
              },
            });
          }
        },
        { host, preserved },
      );

      const responsePath =
        host === "turbo"
          ? `/interop/turbo/${version}/next?backend=1${nested ? "&nested=1" : ""}`
          : `/interop/htmx/${version}/fragment/inner?backend=1${nested ? "&nested=1" : ""}`;
      const [hostResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().includes(responsePath)),
        page.locator(trigger).click(),
      ]);
      expect(hostResponse.status()).toBe(200);
      await page.waitForFunction(() => !(window as ProbeWindow).__oldBackend.isConnected);
      await page.evaluate(async (host) => {
        const owner = window as ProbeWindow;
        const bridge = owner[host === "turbo" ? "__turboBridge" : "__htmxBridge"];
        if (!bridge) throw new Error("The host bridge is missing.");
        await bridge.whenIdle();
      }, host);
      const after = await page.evaluate(
        ({ host, preserved }) => {
          const owner = window as ProbeWindow;
          const incoming = document.querySelector<HTMLElement>("#incoming-backend");
          const jquery = owner[host === "turbo" ? "__turboBridgeJQuery" : "__htmxBridgeJQuery"];
          return {
            oldDestroyed: owner.__oldInstance.destroyed,
            oldConnected: owner.__oldBackend.isConnected,
            oldCount: owner.__oldBackend.querySelector("[data-part=count]")?.textContent,
            oldFinished: owner.__oldLifecycle.filter((event) => event === "finished").length,
            removal: owner.__nativeRemoval,
            incomingOwned: !!incoming && !!jquery?.(incoming).star("instance"),
            incomingCount: incoming?.querySelector("[data-part=count]")?.textContent,
            preservedIdentity: document.querySelector(preserved) === owner.__preserved,
            preservedValue: owner.__preserved.querySelector("input")?.value,
            hostResult:
              host === "turbo"
                ? document.body.dataset.route === "next"
                : !!document.querySelector("#inner-result"),
          };
        },
        { host, preserved },
      );
      expect(after).toMatchObject({
        oldDestroyed: true,
        oldConnected: false,
        oldCount: "12",
        oldFinished: 3,
        incomingOwned: true,
        incomingCount: "21",
        preservedIdentity: true,
        preservedValue: "retained-value",
        hostResult: true,
      });
      expect(after.removal.length).toBeGreaterThan(0);
      expect(after.removal.every(({ destroyedBefore }) => destroyedBefore)).toBe(true);
      if (nested) {
        const outer = await page.evaluate((host) => {
          const owner = window as ProbeWindow;
          const root = document.querySelector(host === "turbo" ? "#main" : "#region");
          const jquery = owner[host === "turbo" ? "__turboBridgeJQuery" : "__htmxBridgeJQuery"];
          return root && jquery?.(root).star("instance")?.state;
        }, host);
        expect(outer).toEqual({ outer: 100 });
      }

      await page.evaluate(() => {
        const owner = window as ProbeWindow;
        owner.__oldBackend.querySelector<HTMLButtonElement>("[data-part=json]")?.click();
        owner.__oldBackend.querySelector<HTMLButtonElement>("[data-part=streamed]")?.click();
      });
      expect(backendRequests).toHaveLength(3);
      await exerciseBackend(page, host, version, "incoming");
      expect(backendRequests).toHaveLength(6);
      expect(await page.locator("body").getAttribute("data-route")).toBe(
        host === "turbo" ? "next" : "start",
      );
    });
  }
}

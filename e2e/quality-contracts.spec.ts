import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface BrowserBudgets {
  domNodes: number;
  activeMutationObservers: number;
  eventListeners: number;
  pendingTimers: number;
  requests: number;
  queries: number;
  patchMutations: number;
}

const budgets = (
  JSON.parse(readFileSync(new URL("../config/quality-budgets.json", import.meta.url), "utf8")) as {
    browser: BrowserBudgets;
  }
).browser;
const runtimeURL = `/@fs${resolve("e2e/fixtures/runtime.ts")}`;
const networkProofOrigin = `http://127.0.0.1:${Number(process.env.JQS_NETWORK_PROOF_PORT ?? 4174)}`;
const sabotage = process.env.JQS_QUALITY_SABOTAGE ?? "";

test("@selftest production Playwright config keeps retry-passes red", async ({
  page: _page,
}, testInfo) => {
  if (sabotage !== "retry-pass") return;
  expect(testInfo.retry).toBeGreaterThan(0);
});

test("@shared keyboard, error, updated, open, and disabled states remain accessible", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const trigger = page.getByRole("button", { name: "Open verified dialog" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Keep building this system?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  if (sabotage === "accessibility") {
    await dialog.evaluate((element) =>
      element.insertAdjacentHTML("beforeend", "<button></button>"),
    );
  }
  let axe = await new AxeBuilder({ page }).include("#proof-dialog").analyze();
  expect(axe.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  const form = page.getByRole("form", { name: "Backend account proof" });
  const submit = form.getByRole("button", { name: "Send multipart form" });
  await submit.click();
  await expect(form.getByRole("textbox", { name: "Account email" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.locator('[data-part="message"]')).toContainText("already exists");
  axe = await new AxeBuilder({ page }).include("#component-backend-form").analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Refresh operations" }).click();
  await expect(page.locator(".operations-message")).toContainText("revision");
  await expect(submit).toBeEnabled();
});

test("@shared external render preservation retains identity, state, focus, value, and handlers", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(async (runtimePath) => {
    const runtime = (await import(runtimePath)) as {
      createRenderAdapter(value: JQueryStatic): {
        begin(root: Element): {
          beforeRemove(root: Element): void;
          commit(incoming?: Iterable<Element>): Promise<void>;
        };
      };
      installStar(value: JQueryStatic): void;
      jquery: JQueryStatic;
    };
    const { jquery } = runtime;
    runtime.installStar(jquery);
    const host = document.createElement("main");
    host.innerHTML = `
      <section id="render-outgoing">
        <article id="render-preserved" data-jqs-preserve><input value="kept"></article>
        <article id="render-removed"></article>
      </section>
    `;
    document.body.append(host);
    const outgoing = host.querySelector("#render-outgoing")!;
    const preserved = host.querySelector("#render-preserved")!;
    const removed = host.querySelector("#render-removed")!;
    const input = preserved.querySelector("input")!;
    jquery(preserved).star({ state: { count: 7 } });
    jquery(removed).star({ state: { count: 8 } });
    const preservedInstance = jquery(preserved).star("instance")!;
    const removedInstance = jquery(removed).star("instance")!;
    let handlerCalls = 0;
    jquery(input).on("jqstar-preserved", () => {
      handlerCalls += 1;
    });
    input.focus();

    const transaction = runtime.createRenderAdapter(jquery).begin(host);
    transaction.beforeRemove(outgoing);
    const incomingContainer = document.createElement("section");
    incomingContainer.innerHTML =
      '<article id="render-incoming" data-signals="{ ready: true }"></article>';
    outgoing.before(incomingContainer);
    const incoming = incomingContainer.querySelector("#render-incoming")!;
    incomingContainer.prepend(preserved);
    outgoing.remove();
    await transaction.commit([incoming]);
    jquery(input).trigger("jqstar-preserved");

    const proof = {
      focus: document.activeElement === input,
      handlerCalls,
      incoming: jquery(incoming).star("instance")?.state.ready,
      preservedIdentity: jquery(preserved).star("instance") === preservedInstance,
      preservedState: preservedInstance.state.count,
      removed: removedInstance.destroyed,
      value: input.value,
    };
    jquery(preserved).star("destroy");
    jquery(incoming).star("destroy");
    host.remove();
    return proof;
  }, runtimeURL);

  expect(result).toEqual({
    focus: true,
    handlerCalls: 1,
    incoming: true,
    preservedIdentity: true,
    preservedState: 7,
    removed: true,
    value: "kept",
  });
});

test("@shared repeated enhancement stays inside structural ownership budgets", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = {
      eventListeners: 0,
      activeMutationObservers: 0,
      pendingTimers: 0,
      requests: 0,
      queries: 0,
      patchMutations: 0,
    };
    Object.defineProperty(window, "__jqstarQualityMetrics", { value: metrics });

    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    const registrations = new WeakMap<
      EventTarget,
      Map<string, Set<EventListenerOrEventListenerObject>>
    >();
    const listenerKey = (type: string, options?: boolean | AddEventListenerOptions): string =>
      `${type}:${String(typeof options === "boolean" ? options : (options?.capture ?? false))}`;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (listener) {
        let targetRegistrations = registrations.get(this);
        if (!targetRegistrations) {
          targetRegistrations = new Map();
          registrations.set(this, targetRegistrations);
        }
        const key = listenerKey(type, options);
        let listeners = targetRegistrations.get(key);
        if (!listeners) {
          listeners = new Set();
          targetRegistrations.set(key, listeners);
        }
        if (!listeners.has(listener)) {
          listeners.add(listener);
          metrics.eventListeners += 1;
        }
      }
      return nativeAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (listener) {
        const key = listenerKey(type, options);
        const listeners = registrations.get(this)?.get(key);
        if (listeners?.delete(listener)) metrics.eventListeners -= 1;
      }
      return nativeRemove.call(this, type, listener, options);
    };

    for (const prototype of [Document.prototype, Element.prototype]) {
      for (const name of ["querySelector", "querySelectorAll"] as const) {
        const nativeQuery = Reflect.get(prototype, name) as (...args: unknown[]) => unknown;
        Object.defineProperty(prototype, name, {
          configurable: true,
          value(this: Document | Element, ...args: unknown[]) {
            metrics.queries += 1;
            return Reflect.apply(nativeQuery, this, args);
          },
          writable: true,
        });
      }
    }

    const NativeObserver = window.MutationObserver;
    window.MutationObserver = class extends NativeObserver {
      private qualityActive = false;
      observe(...args: Parameters<MutationObserver["observe"]>): void {
        if (!this.qualityActive) {
          metrics.activeMutationObservers += 1;
          this.qualityActive = true;
        }
        super.observe(...args);
      }
      disconnect(): void {
        if (this.qualityActive) {
          metrics.activeMutationObservers -= 1;
          this.qualityActive = false;
        }
        super.disconnect();
      }
    };

    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    const pending = new Set<number>();
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      let id = 0;
      const wrapped = (...inner: unknown[]): void => {
        pending.delete(id);
        metrics.pendingTimers = pending.size;
        if (typeof handler === "function") handler(...inner);
      };
      id = nativeSetTimeout(wrapped, timeout, ...args);
      pending.add(id);
      metrics.pendingTimers = pending.size;
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => {
      if (id !== undefined) pending.delete(id);
      metrics.pendingTimers = pending.size;
      return nativeClearTimeout(id);
    }) as typeof window.clearTimeout;

    Object.defineProperty(window, "__jqstarResetQualityCounters", {
      value() {
        pending.clear();
        metrics.pendingTimers = 0;
        metrics.requests = 0;
        metrics.queries = 0;
        metrics.patchMutations = 0;
      },
    });

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      metrics.requests += 1;
      return nativeFetch(...args);
    };

    new NativeObserver((records) => {
      metrics.patchMutations += records.length;
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });

  await page.goto("/components/lab/");
  await page.waitForLoadState("networkidle");
  const observed = await page.evaluate(async (runtimePath) => {
    const metrics = window.__jqstarQualityMetrics;
    const runtime = (await import(runtimePath)) as {
      installStar(value: JQueryStatic): void;
      jquery: JQueryStatic;
    };
    const { jquery } = runtime;
    runtime.installStar(jquery);
    const snapshot = () => ({
      ...metrics,
      domNodes: document.querySelectorAll("*").length,
    });
    const relative = (
      value: ReturnType<typeof snapshot>,
      baseline: ReturnType<typeof snapshot>,
    ) => ({
      activeMutationObservers: value.activeMutationObservers - baseline.activeMutationObservers,
      eventListeners: value.eventListeners - baseline.eventListeners,
      pendingTimers: value.pendingTimers,
      requests: value.requests,
      queries: value.queries,
      patchMutations: value.patchMutations,
      domNodes: value.domNodes,
      domNodeDelta: value.domNodes - baseline.domNodes,
    });
    const baseline = snapshot();
    window.__jqstarResetQualityCounters();

    const mount = () => {
      const root = document.createElement("section");
      root.setAttribute("data-signals", "{ ownershipCount: 0 }");
      root.innerHTML =
        '<button type="button" data-on:click="$ownershipCount++">Increment ownership count</button>';
      document.body.append(root);
      const selection = jquery(root);
      selection.star();
      return { root, selection };
    };
    const settle = async () => {
      await jquery.star.nextUpdate();
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
      await jquery.star.nextUpdate();
    };
    const first = mount();
    const mounted = snapshot();
    for (let index = 0; index < 20; index += 1) jquery.star.ui.enhance(first.root);
    first.root.querySelector<HTMLButtonElement>("button")?.click();
    await settle();
    const enhanced = snapshot();
    first.selection.star("destroy");
    first.selection.star("destroy");
    first.root.remove();
    await settle();
    const disposed = snapshot();

    const second = mount();
    jquery.star.ui.enhance(second.root);
    second.selection.star("destroy");
    second.root.remove();
    await settle();
    const remountDisposed = snapshot();

    return {
      baseline,
      mounted: relative(mounted, baseline),
      enhanced: relative(enhanced, baseline),
      disposed: relative(disposed, baseline),
      remountDisposed: relative(remountDisposed, baseline),
    };
  }, runtimeURL);

  await page.getByRole("button", { name: "Open verified dialog" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open verified dialog" })).toBeFocused();

  console.log(`JQS_BROWSER_BUDGET_OBSERVED ${JSON.stringify(observed)}`);

  expect(observed.enhanced.domNodes).toBeLessThanOrEqual(
    sabotage === "ownership-budget" ? 1 : budgets.domNodes,
  );
  expect(observed.enhanced.activeMutationObservers).toBeLessThanOrEqual(
    budgets.activeMutationObservers,
  );
  expect(observed.enhanced.eventListeners).toBeLessThanOrEqual(budgets.eventListeners);
  expect(observed.enhanced.pendingTimers).toBeLessThanOrEqual(budgets.pendingTimers);
  expect(observed.enhanced.requests).toBeLessThanOrEqual(budgets.requests);
  expect(observed.remountDisposed.queries).toBeLessThanOrEqual(budgets.queries);
  expect(observed.remountDisposed.patchMutations).toBeLessThanOrEqual(budgets.patchMutations);

  expect(observed.enhanced.activeMutationObservers).toBe(observed.mounted.activeMutationObservers);
  expect(observed.enhanced.eventListeners).toBe(observed.mounted.eventListeners);
  for (const disposed of [observed.disposed, observed.remountDisposed]) {
    expect(disposed.domNodeDelta).toBe(0);
    expect(disposed.activeMutationObservers).toBe(0);
    expect(disposed.eventListeners).toBe(0);
    expect(disposed.pendingTimers).toBe(0);
    expect(disposed.requests).toBe(0);
  }
});

test("@shared render commits clean nested roots before removal and settle incoming UI", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(async (runtimePath) => {
    const runtime = (await import(runtimePath)) as {
      installStar(value: JQueryStatic): void;
      jquery: JQueryStatic;
      patchElements(
        root: Element,
        source: string,
        options: { selector: string; mode: "append" | "remove" },
      ): void;
    };
    const { jquery } = runtime;
    runtime.installStar(jquery);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<main id="quality-render" data-signals="{ count: 7 }">
         <section id="quality-outer"><section id="quality-inner"></section></section>
       </main>`,
    );
    const rootElement = document.querySelector("#quality-render")!;
    const outerElement = document.querySelector("#quality-outer")!;
    const innerElement = document.querySelector("#quality-inner")!;
    const root = jquery(rootElement);
    const order: string[] = [];
    root.star();
    jquery(outerElement).star({
      ui: {
        "&": {
          mount: () => () => order.push(`outer:${String(outerElement.isConnected)}`),
        },
      },
    });
    jquery(innerElement).star({
      ui: {
        "&": {
          mount: () => () => order.push(`inner:${String(innerElement.isConnected)}`),
        },
      },
    });

    runtime.patchElements(rootElement, "", {
      selector: "#quality-outer",
      mode: "remove",
    });
    runtime.patchElements(
      rootElement,
      `<output data-text="$count"></output>
       <dialog data-jqs="dialog"><h2 data-part="title">Committed</h2></dialog>`,
      { selector: "#quality-render", mode: "append" },
    );
    await jquery.star.whenEnhanced();

    const output = rootElement.querySelector("output")?.textContent;
    const dialog = rootElement.querySelector("dialog");
    const result = {
      ariaModal: dialog?.getAttribute("aria-modal"),
      order,
      output,
      titleOwner: dialog?.getAttribute("aria-labelledby"),
      titleId: dialog?.querySelector("[data-part='title']")?.id,
    };
    root.star("destroy");
    rootElement.remove();
    return result;
  }, runtimeURL);

  expect(result).toEqual({
    ariaModal: "true",
    order: ["inner:true", "outer:true"],
    output: "7",
    titleOwner: result.titleId,
    titleId: result.titleId,
  });
  expect(result.titleId).toMatch(/^jqs-dialog-/);
});

test("@shared proof network detects abort, delay, disconnect, malformed, retry, redirect, conflict, and partial streams", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ origin, runtimePath }) => {
      const runtime = (await import(runtimePath)) as {
        installStar(value: JQueryStatic): void;
        jquery: JQueryStatic;
      };
      const { jquery } = runtime;
      runtime.installStar(jquery);
      document.body.insertAdjacentHTML(
        "beforeend",
        `<section id="quality-network" data-signals="{ networkState: 'initial' }">
         <ul id="quality-network-feed"></ul>
       </section>`,
      );
      const root = jquery("#quality-network");
      root.star();
      const application = root.star<{ networkState: string }>("instance");
      if (!application) throw new Error("The network proof application did not start.");

      const delay = application.run(
        jquery.star.get(`${origin}/network?case=delay`, {
          requestCancellation: "cleanup",
          retry: "never",
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
      root.star("destroy");
      const aborted = (await delay) === undefined;

      root.star();
      const active = root.star<{ networkState: string }>("instance");
      if (!active) throw new Error("The network proof application did not restart.");

      let disconnected = false;
      try {
        await active.run(
          jquery.star.get(`${origin}/network?case=disconnect`, {
            retry: "never",
          }),
        );
      } catch {
        disconnected = true;
      }

      let malformed = false;
      try {
        await active.run(
          jquery.star.get(`${origin}/network?case=malformed`, {
            retry: "never",
          }),
        );
      } catch {
        malformed = true;
      }

      const retryToken = `${Date.now()}-${Math.random()}`;
      await active.run(
        jquery.star.get(`${origin}/network?case=retry&token=${retryToken}`, {
          retry: "auto",
          retryInterval: 0,
          retryMaxCount: 1,
        }),
      );
      const retried = active.state.networkState;

      await active.run(
        jquery.star.get(`${origin}/network?case=redirect`, {
          retry: "never",
        }),
      );
      const redirected = active.state.networkState;

      let conflict = false;
      try {
        await active.run(
          jquery.star.get(`${origin}/network?case=conflict`, {
            retry: "never",
          }),
        );
      } catch (error) {
        conflict = error instanceof Error && error.message.includes("409");
      }

      await active.run(
        jquery.star.get(`${origin}/network?case=partial`, {
          retry: "never",
        }),
      );
      await jquery.star.nextUpdate();
      const partial = {
        state: active.state.networkState,
        element: document.querySelector("#quality-network-feed li")?.textContent,
      };
      root.star("destroy");
      return { aborted, conflict, disconnected, malformed, partial, redirected, retried };
    },
    { origin: networkProofOrigin, runtimePath: runtimeURL },
  );

  expect(result).toEqual({
    aborted: true,
    conflict: true,
    disconnected: true,
    malformed: true,
    partial: { element: "partial-two", state: "partial-one" },
    redirected: "redirected",
    retried: "retried-2",
  });
});

test("@mobile touch controls meet the documented target and reflow contracts", async ({ page }) => {
  await page.goto("/components/lab/");
  const targets = await page.locator("body").evaluate((body) => {
    const hidden = (element: HTMLElement): boolean => {
      for (let current: HTMLElement | null = element; current; current = current.parentElement) {
        if (current.hidden) return true;
        const style = getComputedStyle(current);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          style.contentVisibility === "hidden"
        )
          return true;
      }
      const closedDetails = element.closest("details:not([open])");
      return Boolean(
        closedDetails && !closedDetails.querySelector(":scope > summary")?.contains(element),
      );
    };
    return Array.from(
      body.querySelectorAll<HTMLElement>('button, summary, input:not([type="hidden"])'),
    )
      .filter((element) => !hidden(element))
      .map((element) => {
        const target = element.closest("label") ?? element;
        const box = target.getBoundingClientRect();
        const name = element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "";
        const component = element.closest<HTMLElement>("[data-jqs]")?.dataset.jqs ?? "native";
        return {
          descriptor: `${component} ${element.tagName.toLowerCase()}#${element.id || "(no-id)"} ${name.slice(0, 40)} ${element.outerHTML.slice(0, 160)}`,
          height: box.height,
          width: box.width,
        };
      });
  });
  for (const [index, target] of targets.entries()) {
    const minimum = sabotage === "mobile-target" ? 10_000 : 24;
    expect(target.width, `control ${index + 1} ${target.descriptor} width`).toBeGreaterThanOrEqual(
      minimum,
    );
    expect(
      target.height,
      `control ${index + 1} ${target.descriptor} height`,
    ).toBeGreaterThanOrEqual(minimum);
  }
  const body = await page.locator("body").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(body.scroll).toBeLessThanOrEqual(body.client + 1);
});

test("@motion reduced-motion preference reaches the document", async ({ page }) => {
  await page.goto("/components/lab/");
  await expect
    .poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))
    .toBe(true);
  const activeMotion = await page.locator("*").evaluateAll((elements, sabotageMode) => {
    const milliseconds = (value: string): number => {
      const part = value.split(",")[0]?.trim() ?? "0s";
      return part.endsWith("ms") ? Number.parseFloat(part) : Number.parseFloat(part) * 1_000;
    };
    return elements
      .map((element) => {
        const style = getComputedStyle(element);
        return {
          animationMs: milliseconds(style.animationDuration),
          transitionMs: milliseconds(style.transitionDuration),
          tag: element.tagName.toLowerCase(),
        };
      })
      .filter(
        (entry) =>
          entry.animationMs > (sabotageMode === "reduced-motion" ? 0.001 : 0.01) ||
          entry.transitionMs > (sabotageMode === "reduced-motion" ? 0.001 : 0.01),
      );
  }, sabotage);
  expect(activeMotion).toEqual([]);
});

test("@color forced colors preserve visible focus and native controls", async ({ page }) => {
  await page.goto("/components/lab/");
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  const button = page.getByRole("button", { name: "Primary" });
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).toBeVisible();
  const focusIndicator = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusIndicator.outlineStyle).not.toBe("none");
  expect(focusIndicator.outlineWidth).toBeGreaterThan(sabotage === "forced-colors" ? 100 : 0);
});

test("@zoom content reflows at 200 percent", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/components/lab/");
  await page.locator("#open-proof-dialog").evaluate((component) => {
    const proof = component.closest(".component-card");
    if (!proof) throw new Error("The reflow proof component is missing.");
    document.body.replaceChildren(proof);
    document.body.style.minWidth = "0";
    document.body.style.margin = "0";
  });
  await page.locator("html").evaluate((element) => {
    element.style.zoom = "2";
  });
  const viewport = await page.locator("body").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(viewport.scroll).toBeLessThanOrEqual(sabotage === "zoom-reflow" ? 0 : viewport.client + 1);
});

test("@nojs native content and disclosure remain usable without JavaScript", async ({ page }) => {
  await page.goto("/docs/agents/");
  await expect(page.getByRole("heading", { name: "Agent support", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "LLM index" })).toHaveAttribute("href", "/llms.txt");
  await expect(page.getByText("WebMCP is an optional Community Group draft")).toBeVisible();

  await page.goto("/components/lab/");
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: sabotage === "no-javascript" ? "Missing no-JavaScript heading" : "jQStar",
    }),
  ).toBeVisible();
  const disclosure = page.locator("#server-collapsible");
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(page.getByRole("form", { name: "Backend account proof" })).toBeVisible();
});

declare global {
  interface Window {
    __jqstarQualityMetrics: Omit<BrowserBudgets, "domNodes">;
    __jqstarResetQualityCounters(): void;
  }
}

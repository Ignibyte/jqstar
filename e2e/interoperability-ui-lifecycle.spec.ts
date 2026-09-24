import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:4175";

interface TimerProbe {
  created: number[];
  cleared: number[];
}

interface NativeRemoval {
  method: string;
  clearedBefore: boolean;
}

type ProbeWindow = Window &
  typeof globalThis & {
    __timerProbe: TimerProbe;
    __interopUI: { enhance(root: ParentNode): void };
    __oldCountdown: HTMLElement;
    __outgoingTimer: number;
    __preserved: HTMLElement;
    __nativeRemoval: NativeRemoval[];
    __turboBridge?: { whenIdle(): Promise<void> };
    __htmxBridge?: { whenIdle(): Promise<void> };
  };

for (const [host, version, trigger, container, preserved] of [
  ["turbo", "8.0.21", "#document-link", "#main", "#permanent"],
  ["turbo", "8.0.23", "#document-link", "#main", "#permanent"],
  ["htmx", "2.0.0", "#inner-swap", "#region", "#region-preserved"],
  ["htmx", "2.0.10", "#inner-swap", "#region", "#region-preserved"],
] as const) {
  test(`${host} ${version} releases UI timer before native removal and enhances incoming UI`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const owner = window as ProbeWindow;
      const timers: TimerProbe = { created: [], cleared: [] };
      owner.__timerProbe = timers;
      const originalSet = window.setInterval;
      const originalClear = window.clearInterval;
      Object.defineProperty(window, "setInterval", {
        configurable: true,
        writable: true,
        value: (...args: unknown[]) => {
          const id = Reflect.apply(originalSet, window, args) as number;
          if (args[1] === 1_000) timers.created.push(id);
          return id;
        },
      });
      Object.defineProperty(window, "clearInterval", {
        configurable: true,
        writable: true,
        value: (id: number) => {
          timers.cleared.push(id);
          Reflect.apply(originalClear, window, [id]);
        },
      });
    });

    await page.goto(`${origin}/interop/${host}/${version}/start?bridge=1&ui=1`);
    await page.waitForFunction(
      (name) => {
        const owner = window as Partial<ProbeWindow>;
        return !!owner.__interopUI && !!owner[name as "__turboBridge" | "__htmxBridge"];
      },
      host === "turbo" ? "__turboBridge" : "__htmxBridge",
    );

    const initial = await page.evaluate(
      ({ container, preserved }) => {
        const owner = window as ProbeWindow;
        const timers = owner.__timerProbe;
        const before = timers.created.length;
        const boundary = document.querySelector(container);
        const neighbor = document.querySelector<HTMLElement>(preserved);
        if (!boundary || !neighbor) throw new Error("The actual-host UI fixture is incomplete.");
        const root = document.createElement("section");
        root.id = "audit-countdown";
        root.dataset.jqs = "countdown";
        root.dataset.duration = "30";
        root.innerHTML = '<span data-part="seconds"></span>';
        boundary.append(root);
        owner.__interopUI.enhance(boundary);
        owner.__oldCountdown = root;
        const timer = timers.created[before];
        if (timer === undefined) throw new Error("The Countdown did not start its timer.");
        owner.__outgoingTimer = timer;
        owner.__preserved = neighbor;
        const input = neighbor.querySelector("input");
        if (!input) throw new Error("The preserved input is missing.");
        input.value = "retained-value";
        const removal: NativeRemoval[] = [];
        owner.__nativeRemoval = removal;
        const watchMethod = (prototype: object, method: string) => {
          const original = (prototype as Record<string, (...args: unknown[]) => unknown>)[method];
          if (typeof original !== "function") throw new Error(`Missing native ${method}.`);
          Object.defineProperty(prototype, method, {
            configurable: true,
            writable: true,
            value: function (this: unknown, ...args: unknown[]) {
              const connectedBefore = root.isConnected;
              const clearedBefore = timers.cleared.includes(owner.__outgoingTimer);
              const result = Reflect.apply(original, this, args);
              const connectedAfter = root.isConnected;
              if (connectedBefore && !connectedAfter && removal.length === 0)
                removal.push({ method, clearedBefore });
              return result;
            },
          });
        };
        for (const method of ["removeChild", "replaceChild"]) watchMethod(Node.prototype, method);
        for (const method of ["remove", "replaceWith", "replaceChildren"])
          watchMethod(Element.prototype, method);
        for (const name of ["innerHTML", "outerHTML"]) {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, name);
          const set = descriptor?.set;
          if (!set) continue;
          Object.defineProperty(Element.prototype, name, {
            configurable: true,
            ...(descriptor.get ? { get: descriptor.get } : {}),
            set(this: Element, value: string) {
              const connectedBefore = root.isConnected;
              const clearedBefore = timers.cleared.includes(owner.__outgoingTimer);
              Reflect.apply(set, this, [value]);
              const connectedAfter = root.isConnected;
              if (connectedBefore && !connectedAfter && removal.length === 0)
                removal.push({ method: name, clearedBefore });
            },
          });
        }
        return {
          state: root.dataset.state,
          seconds: root.querySelector('[data-part="seconds"]')?.textContent,
          newIntervals: timers.created.length - before,
        };
      },
      { container, preserved },
    );
    expect(initial).toEqual({ state: "running", seconds: "30", newIntervals: 1 });

    const responsePath =
      host === "turbo"
        ? `/interop/turbo/${version}/next?ui=1`
        : `/interop/htmx/${version}/fragment/inner?ui=1`;
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes(responsePath)),
      page.locator(trigger).click(),
    ]);
    expect(response.status()).toBe(200);
    await page.waitForFunction(() => !(window as ProbeWindow).__oldCountdown.isConnected);
    await page.waitForFunction(
      () => document.querySelector<HTMLElement>("#incoming-countdown")?.dataset.state === "running",
    );
    await page.evaluate(async (host) => {
      const owner = window as ProbeWindow;
      const bridge = owner[host === "turbo" ? "__turboBridge" : "__htmxBridge"];
      if (!bridge) throw new Error("The host bridge is missing.");
      await bridge.whenIdle();
    }, host);
    const after = await page.evaluate(
      ({ host, preserved }) => {
        const owner = window as ProbeWindow;
        const incoming = document.querySelector<HTMLElement>("#incoming-countdown");
        return {
          removed: !owner.__oldCountdown.isConnected,
          outgoingCleared: owner.__timerProbe.cleared.includes(owner.__outgoingTimer),
          nativeRemoval: owner.__nativeRemoval,
          incomingState: incoming?.dataset.state,
          incomingSeconds: incoming?.querySelector('[data-part="seconds"]')?.textContent,
          newLiveTimers: owner.__timerProbe.created.filter(
            (id) => id !== owner.__outgoingTimer && !owner.__timerProbe.cleared.includes(id),
          ).length,
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
      removed: true,
      outgoingCleared: true,
      incomingState: "running",
      newLiveTimers: 1,
      preservedIdentity: true,
      preservedValue: "retained-value",
      hostResult: true,
    });
    expect(after.nativeRemoval.length).toBeGreaterThan(0);
    expect(after.nativeRemoval.every(({ clearedBefore }) => clearedBefore)).toBe(true);
    expect(after.incomingSeconds).toMatch(/^\d{2}$/u);
  });
}

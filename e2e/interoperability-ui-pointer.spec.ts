import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:4175";
const pointerTypes = ["pointercancel", "pointermove", "pointerup"] as const;

interface ListenerProbe {
  type: string;
  listener: EventListenerOrEventListenerObject | null;
  removed: boolean;
}

interface NativeRemoval {
  method: string;
  listenersRemovedBefore: boolean;
  captureReleasedBefore: boolean;
}

type ProbeWindow = Window &
  typeof globalThis & {
    __interopUI: { enhance(root: ParentNode): void };
    __pointerListeners: ListenerProbe[];
    __pointerBaseline: number;
    __incomingBaseline: number;
    __incomingListeners: ListenerProbe[];
    __oldResizable: HTMLElement;
    __oldHandle: HTMLElement;
    __oldChanges: number;
    __outgoingListeners: ListenerProbe[];
    __capturedPointerId: number;
    __captureReleases: number[];
    __nativeRemoval: NativeRemoval[];
    __preserved: HTMLElement;
    __turboBridge?: { whenIdle(): Promise<void> };
    __htmxBridge?: { whenIdle(): Promise<void> };
  };

for (const [host, version, trigger, container, preserved] of [
  ["turbo", "8.0.21", "#document-link", "#main", "#permanent"],
  ["turbo", "8.0.23", "#document-link", "#main", "#permanent"],
  ["htmx", "2.0.0", "#inner-swap", "#region", "#region-preserved"],
  ["htmx", "2.0.10", "#inner-swap", "#region", "#region-preserved"],
] as const) {
  test(`${host} ${version} releases an active UI pointer session before native removal`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const owner = window as ProbeWindow;
      const pointerEvents = ["pointercancel", "pointermove", "pointerup"];
      owner.__pointerListeners = [];
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ): void {
        Reflect.apply(add, this, [type, listener, options]);
        if (this === window && pointerEvents.includes(type))
          owner.__pointerListeners.push({ type, listener, removed: false });
      };
      EventTarget.prototype.removeEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ): void {
        Reflect.apply(remove, this, [type, listener, options]);
        if (this !== window) return;
        for (const probe of owner.__pointerListeners) {
          if (probe.type === type && probe.listener === listener) probe.removed = true;
        }
      };
    });

    await page.goto(`${origin}/interop/${host}/${version}/start?bridge=1&ui=1`);
    await page.waitForFunction(
      (name) => {
        const owner = window as Partial<ProbeWindow>;
        return !!owner.__interopUI && !!owner[name as "__turboBridge" | "__htmxBridge"];
      },
      host === "turbo" ? "__turboBridge" : "__htmxBridge",
    );

    await page.evaluate(
      ({ container, preserved }) => {
        const owner = window as ProbeWindow;
        const boundary = document.querySelector(container);
        const neighbor = document.querySelector<HTMLElement>(preserved);
        if (!boundary || !neighbor) throw new Error("The actual-host UI fixture is incomplete.");
        const root = document.createElement("section");
        root.id = "audit-resizable";
        root.dataset.jqs = "resizable";
        root.dataset.value = "[50,50]";
        root.style.cssText = "display:grid;width:400px;height:80px";
        root.innerHTML =
          '<div data-part="panel">First</div><div data-part="handle" aria-label="Resize panels" style="width:16px;background:#888;touch-action:none"></div><div data-part="panel">Second</div>';
        boundary.append(root);
        owner.__oldResizable = root;
        owner.__oldChanges = 0;
        root.addEventListener("jquery-star:resizable:change", () => {
          owner.__oldChanges += 1;
        });
        owner.__interopUI.enhance(boundary);
        const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
        if (!handle) throw new Error("The outgoing Resizable handle is missing.");
        owner.__oldHandle = handle;
        owner.__captureReleases = [];
        const capture = handle.setPointerCapture;
        Object.defineProperty(handle, "setPointerCapture", {
          configurable: true,
          value: (id: number) => {
            owner.__capturedPointerId = id;
            Reflect.apply(capture, handle, [id]);
          },
        });
        const release = handle.releasePointerCapture;
        Object.defineProperty(handle, "releasePointerCapture", {
          configurable: true,
          value: (id: number) => {
            owner.__captureReleases.push(id);
            Reflect.apply(release, handle, [id]);
          },
        });
        owner.__preserved = neighbor;
        const input = neighbor.querySelector("input");
        if (!input) throw new Error("The preserved input is missing.");
        input.value = "retained-value";
      },
      { container, preserved },
    );

    const handle = page.locator("#audit-resizable [data-part=handle]");
    await handle.scrollIntoViewIfNeeded();
    const bounds = await handle.boundingBox();
    if (!bounds) throw new Error("The outgoing Resizable handle has no bounds.");
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.evaluate(() => {
      const owner = window as ProbeWindow;
      owner.__pointerBaseline = owner.__pointerListeners.length;
    });
    await page.mouse.down();
    const started = await page.evaluate(() => {
      const owner = window as ProbeWindow;
      owner.__outgoingListeners = owner.__pointerListeners
        .slice(owner.__pointerBaseline)
        .filter((entry) => !entry.removed);
      return {
        capture: owner.__oldHandle.hasPointerCapture(owner.__capturedPointerId),
        pointerId: owner.__capturedPointerId,
        state: owner.__oldHandle.dataset.state,
        listeners: owner.__outgoingListeners.map((entry) => entry.type).sort(),
      };
    });
    expect(started).toMatchObject({
      capture: true,
      state: "dragging",
      listeners: [...pointerTypes],
    });
    expect(Number.isInteger(started.pointerId)).toBe(true);
    await page.mouse.move(bounds.x + 75, bounds.y + bounds.height / 2, { steps: 3 });
    await expect(page.locator("#audit-resizable")).not.toHaveAttribute("data-value", "[50,50]");

    await page.evaluate(() => {
      const owner = window as ProbeWindow;
      const root = owner.__oldResizable;
      const handle = owner.__oldHandle;
      const removal: NativeRemoval[] = [];
      owner.__nativeRemoval = removal;
      const released = () =>
        owner.__captureReleases.includes(owner.__capturedPointerId) &&
        !handle.hasPointerCapture(owner.__capturedPointerId);
      const listenersRemoved = () => owner.__outgoingListeners.every((entry) => entry.removed);
      const record = (
        method: string,
        connectedBefore: boolean,
        cleanBefore: boolean,
        freeBefore: boolean,
      ) => {
        if (connectedBefore && !root.isConnected && removal.length === 0)
          removal.push({
            method,
            listenersRemovedBefore: cleanBefore,
            captureReleasedBefore: freeBefore,
          });
      };
      const watch = (prototype: object, method: string) => {
        const original = (prototype as Record<string, (...args: unknown[]) => unknown>)[method];
        if (typeof original !== "function") throw new Error(`Missing native ${method}.`);
        Object.defineProperty(prototype, method, {
          configurable: true,
          writable: true,
          value: function (this: unknown, ...args: unknown[]) {
            const connectedBefore = root.isConnected;
            const cleanBefore = listenersRemoved();
            const freeBefore = released();
            const result = Reflect.apply(original, this, args);
            record(method, connectedBefore, cleanBefore, freeBefore);
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
            const cleanBefore = listenersRemoved();
            const freeBefore = released();
            Reflect.apply(set, this, [value]);
            record(name, connectedBefore, cleanBefore, freeBefore);
          },
        });
      }
      if (!handle.hasPointerCapture(owner.__capturedPointerId))
        throw new Error("The active pointer capture ended early.");
    });

    const responsePath =
      host === "turbo"
        ? `/interop/turbo/${version}/next?ui=1`
        : `/interop/htmx/${version}/fragment/inner?ui=1`;
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes(responsePath)),
      page.evaluate((trigger) => {
        const control = document.querySelector<HTMLElement>(trigger);
        if (!control) throw new Error("The host trigger is missing.");
        control.click();
      }, trigger),
    ]);
    expect(response.status()).toBe(200);
    await page.waitForFunction(() => !(window as ProbeWindow).__oldResizable.isConnected);
    await page.waitForFunction(
      () =>
        document
          .querySelector<HTMLElement>("#incoming-resizable [data-part=handle]")
          ?.getAttribute("aria-valuenow") === "50",
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
        return {
          removed: !owner.__oldResizable.isConnected,
          outgoingListenersRemoved: owner.__outgoingListeners.every((entry) => entry.removed),
          captureReleased: owner.__captureReleases.includes(owner.__capturedPointerId),
          removal: owner.__nativeRemoval,
          oldValue: owner.__oldResizable.dataset.value,
          oldChanges: owner.__oldChanges,
          incomingValue: document.querySelector<HTMLElement>("#incoming-resizable")?.dataset.value,
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
      outgoingListenersRemoved: true,
      captureReleased: true,
      incomingValue: "[50,50]",
      preservedIdentity: true,
      preservedValue: "retained-value",
      hostResult: true,
    });
    expect(after.removal.length).toBeGreaterThan(0);
    expect(
      after.removal.every(
        ({ listenersRemovedBefore, captureReleasedBefore }) =>
          listenersRemovedBefore && captureReleasedBefore,
      ),
    ).toBe(true);
    await page.mouse.move(bounds.x + 130, bounds.y + bounds.height / 2);
    expect(
      await page.evaluate(() => ({
        value: (window as ProbeWindow).__oldResizable.dataset.value,
        changes: (window as ProbeWindow).__oldChanges,
      })),
    ).toEqual({ value: after.oldValue, changes: after.oldChanges });
    await page.mouse.up();

    const incomingHandle = page.locator("#incoming-resizable [data-part=handle]");
    await incomingHandle.scrollIntoViewIfNeeded();
    const nextBounds = await incomingHandle.boundingBox();
    if (!nextBounds) throw new Error("The incoming Resizable handle has no bounds.");
    await page.mouse.move(
      nextBounds.x + nextBounds.width / 2,
      nextBounds.y + nextBounds.height / 2,
    );
    await page.evaluate(() => {
      const owner = window as ProbeWindow;
      owner.__incomingBaseline = owner.__pointerListeners.length;
    });
    await page.mouse.down();
    const incomingStarted = await page.evaluate(() => {
      const owner = window as ProbeWindow;
      owner.__incomingListeners = owner.__pointerListeners.slice(owner.__incomingBaseline);
      return {
        state: document.querySelector<HTMLElement>("#incoming-resizable [data-part=handle]")
          ?.dataset.state,
        listeners: owner.__incomingListeners.map((entry) => entry.type).sort(),
      };
    });
    expect(incomingStarted).toEqual({ state: "dragging", listeners: [...pointerTypes] });
    await page.mouse.move(nextBounds.x + 70, nextBounds.y + nextBounds.height / 2, { steps: 3 });
    await page.mouse.up();
    await expect(incomingHandle).toHaveAttribute("data-state", "idle");
    await expect(page.locator("#incoming-resizable")).not.toHaveAttribute("data-value", "[50,50]");
    const incoming = await page.evaluate(() => {
      const owner = window as ProbeWindow;
      return {
        allReleased: [...owner.__outgoingListeners, ...owner.__incomingListeners].every(
          (entry) => entry.removed,
        ),
      };
    });
    expect(incoming).toEqual({ allReleased: true });
  });
}

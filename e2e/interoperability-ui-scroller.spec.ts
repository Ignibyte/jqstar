import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:4175";

interface ObserverProbe {
  target: Node | null;
  disconnected: boolean;
}

interface ListenerProbe {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject | null;
  removed: boolean;
}

interface NativeRemoval {
  method: string;
  observerDisconnectedBefore: boolean;
  listenersRemovedBefore: boolean;
}

type ProbeWindow = Window &
  typeof globalThis & {
    __interopUI: { enhance(root: ParentNode): void };
    __observers: ObserverProbe[];
    __listeners: ListenerProbe[];
    __oldScroller: HTMLElement;
    __oldContent: HTMLElement;
    __outgoingObserver: ObserverProbe;
    __outgoingListeners: ListenerProbe[];
    __oldMessages: number;
    __oldLatest: number;
    __oldLatestBaseline: number;
    __incomingMessages: number;
    __incomingLatest: number;
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
  test(`${host} ${version} releases UI observer and listeners before native removal`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const owner = window as ProbeWindow;
      owner.__observers = [];
      owner.__listeners = [];
      const NativeObserver = window.MutationObserver;
      window.MutationObserver = class extends NativeObserver {
        private readonly probe: ObserverProbe;

        constructor(callback: MutationCallback) {
          super(callback);
          this.probe = { target: null, disconnected: false };
          owner.__observers.push(this.probe);
        }

        override observe(target: Node, options?: MutationObserverInit): void {
          this.probe.target = target;
          this.probe.disconnected = false;
          super.observe(target, options);
        }

        override disconnect(): void {
          this.probe.disconnected = true;
          super.disconnect();
        }
      };
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ): void {
        Reflect.apply(add, this, [type, listener, options]);
        if (
          this instanceof Element &&
          this.closest('[data-jqs="message-scroller"]') &&
          (type === "scroll" || type === "click")
        )
          owner.__listeners.push({ target: this, type, listener, removed: false });
      };
      EventTarget.prototype.removeEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ): void {
        Reflect.apply(remove, this, [type, listener, options]);
        for (const probe of owner.__listeners) {
          if (probe.target === this && probe.type === type && probe.listener === listener)
            probe.removed = true;
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

    const initial = await page.evaluate(
      ({ container, preserved }) => {
        const owner = window as ProbeWindow;
        const boundary = document.querySelector(container);
        const neighbor = document.querySelector<HTMLElement>(preserved);
        if (!boundary || !neighbor) throw new Error("The actual-host UI fixture is incomplete.");
        const root = document.createElement("section");
        root.id = "audit-message-scroller";
        root.dataset.jqs = "message-scroller";
        root.innerHTML =
          '<div data-part="viewport"><div data-part="content"></div></div><button data-part="latest">Latest</button>';
        boundary.append(root);
        owner.__oldScroller = root;
        const oldContent = root.querySelector<HTMLElement>('[data-part="content"]');
        if (!oldContent) throw new Error("The outgoing Message Scroller content is missing.");
        owner.__oldContent = oldContent;
        owner.__oldMessages = 0;
        owner.__oldLatest = 0;
        root.addEventListener("jquery-star:message-scroller:messages", () => {
          owner.__oldMessages += 1;
        });
        root.addEventListener("jquery-star:message-scroller:latest", () => {
          owner.__oldLatest += 1;
        });
        owner.__interopUI.enhance(boundary);
        const observer = owner.__observers.find((entry) => entry.target === owner.__oldContent);
        if (!observer) throw new Error("The outgoing Message Scroller observer is missing.");
        owner.__outgoingObserver = observer;
        owner.__outgoingListeners = owner.__listeners.filter((entry) =>
          root.contains(entry.target as Node),
        );
        owner.__preserved = neighbor;
        const input = neighbor.querySelector("input");
        if (!input) throw new Error("The preserved input is missing.");
        input.value = "retained-value";
        const removal: NativeRemoval[] = [];
        owner.__nativeRemoval = removal;
        const recordRemoval = (
          method: string,
          connectedBefore: boolean,
          disconnectedBefore: boolean,
          releasedBefore: boolean,
        ) => {
          if (connectedBefore && !root.isConnected && removal.length === 0)
            removal.push({
              method,
              observerDisconnectedBefore: disconnectedBefore,
              listenersRemovedBefore: releasedBefore,
            });
        };
        const watchMethod = (prototype: object, method: string) => {
          const original = (prototype as Record<string, (...args: unknown[]) => unknown>)[method];
          if (typeof original !== "function") throw new Error(`Missing native ${method}.`);
          Object.defineProperty(prototype, method, {
            configurable: true,
            writable: true,
            value: function (this: unknown, ...args: unknown[]) {
              const connectedBefore = root.isConnected;
              const disconnectedBefore = observer.disconnected;
              const releasedBefore = owner.__outgoingListeners.every((entry) => entry.removed);
              const result = Reflect.apply(original, this, args);
              recordRemoval(method, connectedBefore, disconnectedBefore, releasedBefore);
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
              const disconnectedBefore = observer.disconnected;
              const releasedBefore = owner.__outgoingListeners.every((entry) => entry.removed);
              Reflect.apply(set, this, [value]);
              recordRemoval(name, connectedBefore, disconnectedBefore, releasedBefore);
            },
          });
        }
        const message = document.createElement("p");
        message.dataset.jqs = "message";
        owner.__oldContent.append(message);
        return {
          state: root.dataset.state,
          observed: !observer.disconnected,
          listeners: owner.__outgoingListeners.map((entry) => entry.type).sort(),
        };
      },
      { container, preserved },
    );
    expect(initial).toEqual({ state: "following", observed: true, listeners: ["click", "scroll"] });
    await page.waitForFunction(() => (window as ProbeWindow).__oldMessages === 1);
    await page.waitForFunction(() => (window as ProbeWindow).__oldLatest >= 1);
    await page.evaluate(() => {
      const owner = window as ProbeWindow;
      owner.__oldLatestBaseline = owner.__oldLatest;
    });

    const responsePath =
      host === "turbo"
        ? `/interop/turbo/${version}/next?ui=1`
        : `/interop/htmx/${version}/fragment/inner?ui=1`;
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes(responsePath)),
      page.locator(trigger).click(),
    ]);
    expect(response.status()).toBe(200);
    await page.waitForFunction(() => !(window as ProbeWindow).__oldScroller.isConnected);
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>("#incoming-message-scroller")?.dataset.state ===
        "following",
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
        const incoming = document.querySelector<HTMLElement>("#incoming-message-scroller");
        const content = incoming?.querySelector<HTMLElement>('[data-part="content"]');
        if (!incoming || !content) throw new Error("The incoming Message Scroller is missing.");
        const detachedMessage = document.createElement("p");
        detachedMessage.dataset.jqs = "message";
        owner.__oldContent.append(detachedMessage);
        const oldLatest =
          owner.__oldScroller.querySelector<HTMLButtonElement>('[data-part="latest"]');
        if (!oldLatest) throw new Error("The outgoing Message Scroller button is missing.");
        oldLatest.click();
        owner.__incomingMessages = 0;
        owner.__incomingLatest = 0;
        incoming.addEventListener("jquery-star:message-scroller:messages", () => {
          owner.__incomingMessages += 1;
        });
        incoming.addEventListener("jquery-star:message-scroller:latest", () => {
          owner.__incomingLatest += 1;
        });
        const newMessage = document.createElement("p");
        newMessage.dataset.jqs = "message";
        content.append(newMessage);
        return {
          removed: !owner.__oldScroller.isConnected,
          outgoingObserverDisconnected: owner.__outgoingObserver.disconnected,
          outgoingListenersRemoved: owner.__outgoingListeners.every((entry) => entry.removed),
          nativeRemoval: owner.__nativeRemoval,
          incomingObserverLive: owner.__observers.some(
            (entry) => entry.target === content && !entry.disconnected,
          ),
          incomingListeners: owner.__listeners
            .filter((entry) => incoming.contains(entry.target as Node) && !entry.removed)
            .map((entry) => entry.type)
            .sort(),
          preservedIdentity: document.querySelector(preserved) === owner.__preserved,
          preservedValue: owner.__preserved.querySelector("input")?.value,
          hostResult:
            host === "turbo"
              ? document.body.dataset.route === "next"
              : !!document.querySelector("#inner-result"),
          oldMessageCount: owner.__oldMessages,
          oldLatestCount: owner.__oldLatest,
          oldLatestBaseline: owner.__oldLatestBaseline,
        };
      },
      { host, preserved },
    );
    await page.waitForFunction(() => (window as ProbeWindow).__incomingMessages === 1);
    await page.waitForFunction(() => (window as ProbeWindow).__incomingLatest >= 1);
    const latestBeforeClick = await page.evaluate(() => (window as ProbeWindow).__incomingLatest);
    await page.evaluate(() => {
      const latest = document.querySelector<HTMLButtonElement>(
        '#incoming-message-scroller [data-part="latest"]',
      );
      if (!latest) throw new Error("The incoming Message Scroller button is missing.");
      latest.click();
    });
    expect(await page.evaluate(() => (window as ProbeWindow).__incomingLatest)).toBe(
      latestBeforeClick + 1,
    );
    expect(after).toMatchObject({
      removed: true,
      outgoingObserverDisconnected: true,
      outgoingListenersRemoved: true,
      incomingObserverLive: true,
      incomingListeners: ["click", "scroll"],
      preservedIdentity: true,
      preservedValue: "retained-value",
      hostResult: true,
      oldMessageCount: 1,
    });
    expect(after.oldLatestCount).toBe(after.oldLatestBaseline);
    expect(after.nativeRemoval.length).toBeGreaterThan(0);
    expect(
      after.nativeRemoval.every(
        ({ observerDisconnectedBefore, listenersRemovedBefore }) =>
          observerDisconnectedBefore && listenersRemovedBefore,
      ),
    ).toBe(true);
  });
}

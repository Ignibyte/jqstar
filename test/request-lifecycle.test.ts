import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installStarCore, type StarInstance } from "../src/core";

interface PendingRequest {
  readonly signal: AbortSignal;
  succeed(): void;
  fail(error: Error): void;
}

function controlledRequests(): {
  readonly fetch: typeof fetch;
  started(path: string): Promise<PendingRequest>;
} {
  const requests = new Map<string, PendingRequest>();
  const waiters = new Map<string, (request: PendingRequest) => void>();
  return {
    fetch(input, init) {
      const signal = init?.signal;
      if (!signal) throw new Error("The request did not provide a cancellation signal.");
      const path = new URL(input instanceof Request ? input.url : input).pathname;
      return new Promise<Response>((resolve, reject) => {
        const fail = (error: Error): void => {
          signal.removeEventListener("abort", abort);
          reject(error);
        };
        const abort = (): void => fail(new DOMException("Request aborted.", "AbortError"));
        const request: PendingRequest = {
          signal,
          succeed() {
            signal.removeEventListener("abort", abort);
            resolve(new Response(null, { status: 204 }));
          },
          fail,
        };
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        requests.set(path, request);
        waiters.get(path)?.(request);
        waiters.delete(path);
      });
    },
    started(path) {
      const request = requests.get(path);
      if (request) return Promise.resolve(request);
      return new Promise((resolve) => waiters.set(path, resolve));
    },
  };
}

describe.each(["attributes", "behavior"] as const)("%s request ownership", (mode) => {
  let installed: ReturnType<typeof installStarCore>;
  let dispose: () => void;

  function mount(id: string): StarInstance {
    const root = document.createElement("section");
    root.id = id;
    document.body.append(root);
    if (mode === "attributes") $(root).star();
    else $(root).star({ state: { count: 0 } });
    const application = $(root).star("instance");
    if (!application) throw new Error("The request application did not mount.");
    expect(application.mode).toBe(mode);
    return application;
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    installed = installStarCore($, { document });
    const api = installed.star;
    dispose = () => {
      api.dispose();
    };
  });

  afterEach(() => {
    dispose();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it.each(
    ["application", "kernel"].flatMap((teardown) =>
      ["completed", "failed"].flatMap((outcome) =>
        [true, false].map((shared) => ({ teardown, outcome, shared })),
      ),
    ),
  )(
    "cancels a sibling after $outcome work ($teardown teardown, shared: $shared)",
    async ({ teardown, outcome, shared }) => {
      const transport = controlledRequests();
      vi.stubGlobal("fetch", transport.fetch);
      const application = mount("owner");
      const firstController = new AbortController();
      const secondController = shared ? firstController : new AbortController();
      const options = { openWhenHidden: true, retry: "never" as const };
      const first = application
        .run(installed.star.get("/first", { ...options, requestCancellation: firstController }))
        .catch((error: unknown) => error);
      const second = application
        .run(installed.star.get("/second", { ...options, requestCancellation: secondController }))
        .catch((error: unknown) => error);
      try {
        const [firstRequest, secondRequest] = await Promise.all([
          transport.started("/first"),
          transport.started("/second"),
        ]);
        expect(firstRequest.signal).toBe(firstController.signal);
        expect(secondRequest.signal).toBe(secondController.signal);
        const failure = new Error("First request failed.");
        if (outcome === "failed") firstRequest.fail(failure);
        else firstRequest.succeed();
        if (outcome === "failed") expect(await first).toBe(failure);
        else expect(await first).toMatchObject({ status: 204 });
        expect(secondController.signal.aborted).toBe(false);

        if (teardown === "kernel") dispose();
        else application.destroy();

        expect(application.destroyed).toBe(true);
        expect(secondController.signal.aborted).toBe(true);
        expect(await second).toBeUndefined();
        expect(() => application.destroy()).not.toThrow();
      } finally {
        firstController.abort();
        secondController.abort();
        await Promise.all([first, second]);
      }
    },
  );

  it("preserves caller cancellation after one shared request completes", async () => {
    const transport = controlledRequests();
    vi.stubGlobal("fetch", transport.fetch);
    const application = mount("caller-owned");
    const controller = new AbortController();
    const options = {
      requestCancellation: controller,
      openWhenHidden: true,
      retry: "never" as const,
    };
    const first = application.run(installed.star.get("/first", options));
    const second = application.run(installed.star.get("/second", options));
    const settlement = Promise.allSettled([first, second]);
    try {
      const [firstRequest, secondRequest] = await Promise.all([
        transport.started("/first"),
        transport.started("/second"),
      ]);
      firstRequest.succeed();
      await first;
      controller.abort("caller canceled");
      expect(secondRequest.signal.aborted).toBe(true);
      expect(await second).toBeUndefined();
      expect(application.destroyed).toBe(false);
    } finally {
      controller.abort();
      await settlement;
    }
  });

  it("retains independent root ownership while releasing a shared-controller sibling", async () => {
    const transport = controlledRequests();
    vi.stubGlobal("fetch", transport.fetch);
    const firstRoot = mount("first-root");
    const otherRoot = mount("other-root");
    const firstController = new AbortController();
    const otherController = new AbortController();
    const options = { openWhenHidden: true, retry: "never" as const };
    const first = firstRoot.run(
      installed.star.get("/first", { ...options, requestCancellation: firstController }),
    );
    const sibling = firstRoot.run(
      installed.star.get("/sibling", { ...options, requestCancellation: firstController }),
    );
    const other = otherRoot.run(
      installed.star.get("/other", { ...options, requestCancellation: otherController }),
    );
    const settlement = Promise.allSettled([first, sibling, other]);
    try {
      const [firstRequest, , otherRequest] = await Promise.all([
        transport.started("/first"),
        transport.started("/sibling"),
        transport.started("/other"),
      ]);
      firstRequest.succeed();
      await first;
      firstRoot.destroy();
      expect(firstController.signal.aborted).toBe(true);
      expect(await sibling).toBeUndefined();
      expect(otherController.signal.aborted).toBe(false);
      expect(otherRoot.destroyed).toBe(false);
      otherRequest.succeed();
      expect(await other).toMatchObject({ status: 204 });
    } finally {
      firstController.abort();
      otherController.abort();
      await settlement;
    }
  });
});

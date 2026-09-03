import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { executeBackendRequest } from "../src/fetch";
import { beginRequestOperation, OperationHub } from "../src/observation";
import type {
  StarContext,
  StarInstance,
  StarOperationObservation,
  StarOperationUnsubscribe,
} from "../src/index";

interface TestState extends Record<string, unknown> {
  pending: boolean;
}

const releases: StarOperationUnsubscribe[] = [];

function application(id = "app"): StarInstance<TestState> {
  document.body.innerHTML = `<section id="${id}"></section>`;
  $(`#${id}`).star({ state: { pending: false } });
  const instance = $(`#${id}`).star<TestState>("instance");
  if (!instance) throw new Error("The observation test application did not start.");
  return instance;
}

function observe(
  observer: (observation: StarOperationObservation) => void | PromiseLike<void>,
): void {
  releases.push($.star.observeOperations(observer));
}

function jsonResponse(body: unknown, status = 200): Response {
  const source = JSON.stringify(body);
  return new Response(source, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(new TextEncoder().encode(source).byteLength),
    },
  });
}

function detachedApplication(): StarInstance {
  const root = document.createElement("main");
  return {
    mode: "behavior",
    root,
    $root: $(root),
    state: {},
    computed: {},
    destroyed: false,
    observeOperations: () => () => undefined,
    run: async () => undefined,
    refresh: () => undefined,
    destroy: () => undefined,
  };
}

function detachedContext(instance: StarInstance): StarContext {
  return {
    $,
    state: instance.state,
    computed: instance.computed,
    root: instance.root,
    $root: instance.$root,
    instance,
  };
}

function detachedHub(): OperationHub {
  return new OperationHub((_owner, cleanup) => {
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      cleanup();
    };
  });
}

function rejectUnknown(value: unknown): PromiseLike<never> {
  return {
    then(_resolve: unknown, reject?: (reason: unknown) => unknown) {
      reject?.(value);
    },
  } as unknown as PromiseLike<never>;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  $("body").children().star("destroy");
  for (const release of releases.splice(0).reverse()) release();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("operation observations", () => {
  it("publishes frozen JSON-safe action records while preserving results and failures", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });

    const result = { retained: true };
    await expect(
      instance.run(function saveRecord() {
        return result;
      }),
    ).resolves.toBe(result);

    const original = { private: "raw thrown value" };
    await expect(
      instance.run(function rejectRecord() {
        return rejectUnknown(original);
      }),
    ).rejects.toBe(original);

    expect(observations.map(({ kind, phase }) => `${kind}:${phase}`)).toEqual([
      "action:started",
      "action:completed",
      "action:started",
      "action:failed",
    ]);
    expect(observations[0]?.id).toBe(observations[1]?.id);
    expect(observations[2]?.id).toBe(observations[3]?.id);
    expect(observations[0]?.id).not.toBe(observations[2]?.id);
    expect(observations.every(Object.isFrozen)).toBe(true);
    expect(observations.every(({ owner }) => Object.isFrozen(owner))).toBe(true);

    const failed = observations[3];
    expect(failed?.phase).toBe("failed");
    if (failed?.phase !== "failed") throw new Error("Expected a failed action observation.");
    expect(failed.error).toEqual({
      name: "ThrownValue",
      message: "An operation failed with an object value.",
    });
    expect(Object.isFrozen(failed.error)).toBe(true);
    expect(JSON.parse(JSON.stringify(observations))).toEqual(observations);
    expect(JSON.stringify(observations)).not.toContain("raw thrown value");
  });

  it("uses registration order and a stable subscriber snapshot during delivery", async () => {
    const instance = application();
    const calls: string[] = [];
    let added = false;
    let releaseSecond = (): void => undefined;

    releases.push(
      $.star.observeOperations((observation) => {
        calls.push(`first:${observation.phase}`);
        if (!added) {
          added = true;
          releases.push(
            $.star.observeOperations(
              (next) => {
                calls.push(`third:${next.phase}`);
              },
              { kinds: ["action"] },
            ),
          );
          releaseSecond();
        }
      }),
    );
    releaseSecond = $.star.observeOperations(
      (observation) => {
        calls.push(`second:${observation.phase}`);
      },
      { kinds: ["action"] },
    );
    releases.push(releaseSecond);

    await instance.run(() => undefined);

    expect(calls).toEqual([
      "first:started",
      "second:started",
      "first:completed",
      "third:completed",
    ]);
    releaseSecond();
    releaseSecond();
  });

  it("contains observer and onError failures without changing the action", async () => {
    const instance = application();
    const synchronousFailure = new Error("observer failed");
    const asynchronousFailure = new Error("async observer failed");
    const onError = vi.fn<(error: unknown) => Promise<never>>(() =>
      Promise.reject(new Error("onError failed")),
    );
    const later = vi.fn();

    releases.push(
      $.star.observeOperations(
        (observation) => {
          if (observation.phase === "started") throw synchronousFailure;
          return Promise.reject(asynchronousFailure);
        },
        { onError },
      ),
    );
    releases.push($.star.observeOperations(later));

    await expect(instance.run(() => 42)).resolves.toBe(42);
    await Promise.resolve();
    await Promise.resolve();

    expect(later).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[0]).toBe(synchronousFailure);
    expect(onError.mock.calls[1]?.[0]).toBe(asynchronousFailure);
  });

  it("uses the same action boundary for named asynchronous actions in both application modes", async () => {
    document.body.innerHTML = `<section id="behavior"></section><section id="attributes"></section>`;
    $("#behavior").star({
      state: { pending: false },
      actions: {
        save: async () => {
          await Promise.resolve();
          return "behavior";
        },
      },
    });
    $("#attributes").star();
    $.star.action("observation.attributes.save", async () => {
      await Promise.resolve();
      return "attributes";
    });
    const behavior = $("#behavior").star<TestState>("instance")!;
    const attributes = $("#attributes").star("instance")!;
    const records: StarOperationObservation[] = [];
    const attributeRecords: StarOperationObservation[] = [];
    const releaseAttributes = attributes.observeOperations((observation) => {
      attributeRecords.push(observation);
    });
    observe((observation) => {
      records.push(observation);
    });

    await expect(behavior.run("save")).resolves.toBe("behavior");
    await expect(attributes.run("observation.attributes.save")).resolves.toBe("attributes");

    expect(records.map(({ owner, phase }) => `${owner.mode}:${phase}`)).toEqual([
      "behavior:started",
      "behavior:completed",
      "attributes:started",
      "attributes:completed",
    ]);
    expect(records.map((record) => (record.kind === "action" ? record.label : "request"))).toEqual([
      "save",
      "save",
      "observation.attributes.save",
      "observation.attributes.save",
    ]);
    expect(attributeRecords.map(({ owner, phase }) => `${owner.mode}:${phase}`)).toEqual([
      "attributes:started",
      "attributes:completed",
    ]);
    releaseAttributes();
  });

  it("scopes application observers and releases them when the application is destroyed", async () => {
    document.body.innerHTML = `<section id="first"></section><section id="second"></section>`;
    $("#first").star({ state: { pending: false } });
    $("#second").star({ state: { pending: false } });
    const first = $("#first").star<TestState>("instance")!;
    const second = $("#second").star<TestState>("instance")!;
    const firstRecords: StarOperationObservation[] = [];
    const release = first.observeOperations((observation) => {
      firstRecords.push(observation);
    });

    await first.run(() => undefined);
    await second.run(() => undefined);
    expect(firstRecords).toHaveLength(2);
    expect(new Set(firstRecords.map(({ owner }) => owner.id)).size).toBe(1);

    first.destroy();
    release();
    release();
    expect(() => first.observeOperations(vi.fn())).toThrow("has been destroyed");
  });

  it("publishes one request lifecycle across progress and retries without sensitive request data", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    const pendingAtCompletion: boolean[] = [];
    observe((observation) => {
      observations.push(observation);
      if (observation.kind === "request" && observation.phase === "completed") {
        pendingAtCompletion.push(instance.state.pending);
      }
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await instance.run(
      $.star.get("https://example.test/private/path?token=secret#fragment", {
        headers: { Authorization: "Bearer hidden" },
        payload: { password: "hidden" },
        credentials: "include",
        pending: "pending",
        retry: "error",
        retryInterval: 0,
        retryMaxCount: 1,
      }),
    );

    const action = observations.filter(({ kind }) => kind === "action");
    const requests = observations.filter(
      (observation): observation is Extract<StarOperationObservation, { kind: "request" }> =>
        observation.kind === "request",
    );
    expect(action.map(({ phase }) => phase)).toEqual(["started", "completed"]);
    expect(requests.map(({ phase }) => phase)).toEqual([
      "started",
      "retrying",
      "progress",
      "completed",
    ]);
    expect(new Set(requests.map(({ id }) => id)).size).toBe(1);
    expect(requests[0]?.parentId).toBe(action[0]?.id);
    expect(requests[0]?.request).toMatchObject({
      method: "GET",
      origin: "https://example.test",
      path: "/private/path",
      attempt: 0,
    });
    expect(pendingAtCompletion).toEqual([false]);
    expect(requests.every(({ request }) => Object.isFrozen(request))).toBe(true);
    const serialized = JSON.stringify(requests);
    for (const forbidden of [
      "token",
      "secret",
      "fragment",
      "Authorization",
      "Bearer",
      "password",
      "credentials",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("supports a root request and classifies external cancellation", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
          once: true,
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const context: StarContext<TestState> = {
      $,
      state: instance.state,
      computed: instance.computed,
      root: instance.root,
      $root: instance.$root,
      instance,
    };

    const request = executeBackendRequest(
      "GET",
      "/cancelled",
      { requestCancellation: controller },
      context,
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    controller.abort("user cancelled");
    await expect(request).resolves.toBeUndefined();

    const requests = observations.filter(
      (observation): observation is Extract<StarOperationObservation, { kind: "request" }> =>
        observation.kind === "request",
    );
    expect(requests.map(({ phase }) => phase)).toEqual(["started", "cancelled"]);
    expect(requests[0]?.parentId).toBeUndefined();
    const cancelled = requests[1];
    expect(cancelled?.phase).toBe("cancelled");
    if (cancelled?.phase === "cancelled") expect(cancelled.reason).toBe("external");
  });

  it("propagates external request cancellation to its direct parent action", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
          once: true,
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const action = instance.run(
      $.star.get("/cancelled-action", { requestCancellation: controller }),
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    controller.abort("user cancelled");
    await expect(action).resolves.toBeUndefined();

    const cancelled = observations.filter(
      (observation): observation is Extract<StarOperationObservation, { phase: "cancelled" }> =>
        observation.phase === "cancelled",
    );
    expect(cancelled).toHaveLength(2);
    expect(cancelled.map(({ kind, reason }) => `${kind}:${reason}`)).toEqual([
      "request:external",
      "action:external",
    ]);
    const request = cancelled[0];
    const parent = cancelled[1];
    if (request?.kind !== "request" || parent?.kind !== "action") {
      throw new Error("Expected request and action cancellation records.");
    }
    expect(request.parentId).toBe(parent.id);
  });

  it("classifies automatic supersession without failing either action", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });
    let invocation = 0;
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => {
      invocation += 1;
      if (invocation === 2) return Promise.resolve(new Response(null, { status: 204 }));
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("superseded", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = instance.run($.star.get("/same-request"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const second = instance.run($.star.get("/same-request"));
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, expect.any(Response)]);

    const requestTerminals = observations.filter(
      (observation) =>
        observation.kind === "request" &&
        ["completed", "cancelled", "failed"].includes(observation.phase),
    );
    expect(requestTerminals.map(({ phase }) => phase).sort()).toEqual(["cancelled", "completed"]);
    const superseded = requestTerminals.find(({ phase }) => phase === "cancelled");
    expect(superseded).toMatchObject({ reason: "superseded" });
  });

  it("classifies application cleanup while retaining the cancelled operation terminals", async () => {
    const instance = application();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("cleanup", "AbortError")), {
          once: true,
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const action = instance.run($.star.get("/cleanup-request"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    instance.destroy();
    await expect(action).resolves.toBeUndefined();

    const cancelled = observations.filter(
      (observation): observation is Extract<StarOperationObservation, { phase: "cancelled" }> =>
        observation.phase === "cancelled",
    );
    expect(cancelled.map(({ kind, reason }) => `${kind}:${reason}`)).toEqual([
      "request:cleanup",
      "action:cleanup",
    ]);
  });

  it("normalizes hostile and primitive failures without reading private thrown values", async () => {
    const hub = detachedHub();
    const instance = detachedApplication();
    const currentContext = detachedContext(instance);
    const records: StarOperationObservation[] = [];
    hub.trackApplication(instance);
    hub.observeKernel((observation) => {
      records.push(observation);
    });
    const hostile = new Error();
    Object.defineProperties(hostile, {
      name: {
        configurable: true,
        get: () => {
          throw new Error("name getter must be contained");
        },
      },
      message: {
        configurable: true,
        get: () => {
          throw new Error("message getter must be contained");
        },
      },
    });

    let caught: unknown;
    try {
      await hub.runAction(
        instance,
        "unsafe\u0000label",
        () => {
          throw hostile;
        },
        currentContext,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(hostile);
    await expect(
      hub.runAction(
        instance,
        "primitive",
        () => rejectUnknown("private primitive"),
        currentContext,
      ),
    ).rejects.toBe("private primitive");

    const failures = records.filter(
      (record): record is Extract<StarOperationObservation, { phase: "failed" }> =>
        record.phase === "failed",
    );
    expect(failures[0]).toMatchObject({
      label: "unsafe�label",
      error: { name: "Error", message: "An operation failed." },
    });
    expect(failures[1]).toMatchObject({
      label: "primitive",
      error: { name: "ThrownValue", message: "private primitive" },
    });
    hub.dispose();
  });

  it("exposes a raw action result before thenable assimilation and closes it once", async () => {
    const hub = detachedHub();
    const instance = detachedApplication();
    const currentContext = detachedContext(instance);
    const records: StarOperationObservation[] = [];
    hub.trackApplication(instance);
    hub.observeKernel((observation) => {
      records.push(observation);
    });
    let thenReads = 0;
    const result = Object.defineProperty({}, "then", {
      get: () => {
        thenReads += 1;
        return vi.fn();
      },
    });

    const operation = hub.startAction(instance, "raw", () => result, currentContext);

    expect(operation.result).toBe(result);
    expect(operation.active()).toBe(true);
    expect(thenReads).toBe(0);
    operation.failed(undefined);
    expect(operation.active()).toBe(false);
    operation.completed();
    expect(records.map(({ phase }) => phase)).toEqual(["started", "failed"]);
    expect(thenReads).toBe(0);
    await expect(operation.settle()).rejects.toThrow("is already complete");
    expect(thenReads).toBe(0);
    hub.dispose();
  });

  it("exposes parent-request cancellation through raw action liveness", () => {
    const hub = detachedHub();
    const instance = detachedApplication();
    const currentContext = detachedContext(instance);
    const records: StarOperationObservation[] = [];
    hub.trackApplication(instance);
    hub.observeKernel((observation) => {
      records.push(observation);
    });

    const operation = hub.startAction(instance, "raw", () => "pending", currentContext);
    expect(operation.active()).toBe(true);
    hub
      .beginRequest(instance, currentContext, "GET", new URL("https://example.test/work"))
      .cancelled(0, "external");
    expect(operation.active()).toBe(false);
    operation.completed();

    expect(records.map(({ kind, phase }) => `${kind}:${phase}`)).toEqual([
      "action:started",
      "request:started",
      "request:cancelled",
      "action:cancelled",
    ]);
    hub.dispose();
  });

  it("classifies a synchronous action failure after child cancellation as cancelled", () => {
    const hub = detachedHub();
    const instance = detachedApplication();
    const currentContext = detachedContext(instance);
    const records: StarOperationObservation[] = [];
    const failure = new Error("setup failed after cancellation");
    hub.trackApplication(instance);
    hub.observeKernel((observation) => {
      records.push(observation);
    });

    expect(() =>
      hub.startAction(
        instance,
        "cancelled setup",
        () => {
          hub
            .beginRequest(instance, currentContext, "GET", new URL("https://example.test/work"))
            .cancelled(0, "external");
          throw failure;
        },
        currentContext,
      ),
    ).toThrow(failure);
    expect(records.map(({ kind, phase }) => `${kind}:${phase}`)).toEqual([
      "action:started",
      "request:started",
      "request:cancelled",
      "action:cancelled",
    ]);
    hub.dispose();
  });

  it("contains synchronous onError failures and rejects invalid detached scopes", async () => {
    const hub = detachedHub();
    const instance = detachedApplication();
    const other = detachedApplication();
    const later = vi.fn();
    hub.trackApplication(instance);
    hub.observeKernel(
      () => {
        throw new Error("observer failed");
      },
      {
        onError: () => {
          throw new Error("onError failed");
        },
      },
    );
    hub.observeKernel(later);

    await expect(
      hub.runAction(instance, "contained", () => "result", detachedContext(instance)),
    ).resolves.toBe("result");
    expect(later).toHaveBeenCalledTimes(2);
    expect(() => hub.observeApplication(other, vi.fn())).toThrow(
      "is not owned by the active kernel",
    );
    expect(() => hub.observeKernel(vi.fn(), "invalid" as never)).toThrow(
      "Operation subscription options must be an object.",
    );
    hub.dispose();
  });

  it("rolls back prepared observers and releases partial preparation failures", async () => {
    const hub = detachedHub();
    const observer = vi.fn();
    const prepared = hub.preparePluginInstall([
      { namespace: "acme.rollback", observers: [{ observer }] },
    ]);
    prepared.rollback();
    prepared.rollback();
    const instance = detachedApplication();
    hub.trackApplication(instance);
    await hub.runAction(instance, "after rollback", () => undefined, detachedContext(instance));
    expect(observer).not.toHaveBeenCalled();
    hub.dispose();

    const failure = new Error("resource ownership failed");
    let owned = 0;
    const released = vi.fn();
    const failingHub = new OperationHub((_owner, cleanup) => {
      owned += 1;
      if (owned === 2) throw failure;
      return () => {
        cleanup();
        released();
      };
    });
    expect(() =>
      failingHub.preparePluginInstall([
        {
          namespace: "acme.partial",
          observers: [{ observer: vi.fn() }, { observer: vi.fn() }],
        },
      ]),
    ).toThrow(failure);
    expect(released).toHaveBeenCalledOnce();
    failingHub.dispose();
  });

  it("uses inert request handles when a context has no active operation hub", () => {
    const instance = detachedApplication();
    const currentContext = detachedContext(instance);
    const request = beginRequestOperation(currentContext, "GET", new URL("https://example.test"));

    request.progress(1, Number.NaN, Number.POSITIVE_INFINITY);
    request.retrying(1, 503);
    request.completed(1, 204);
    request.cancelled(1, "aborted");
    request.failed(1, new Error("ignored"));
  });

  it("publishes preflight visibility cancellation before fetch starts", async () => {
    const instance = application();
    const controller = new AbortController();
    const observations: StarOperationObservation[] = [];
    observe((observation) => {
      observations.push(observation);
    });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const context: StarContext<TestState> = {
      $,
      state: instance.state,
      computed: instance.computed,
      root: instance.root,
      $root: instance.$root,
      instance,
    };

    const request = executeBackendRequest(
      "GET",
      "/hidden-cancel",
      { requestCancellation: controller },
      context,
    );
    controller.abort("hidden request cancelled");
    await expect(request).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(observations.map(({ phase }) => phase)).toEqual(["started", "cancelled"]);
    expect(observations[1]).toMatchObject({ reason: "external" });
  });

  it("observes setup failures through both outer request terminal branches", async () => {
    const instance = application();
    const setupRecords: StarOperationObservation[] = [];
    const releaseSetup = instance.observeOperations((observation) => {
      setupRecords.push(observation);
    });
    const invalidPending = instance.run($.star.get("/invalid-pending", { pending: "." }));
    await expect(invalidPending).rejects.toThrow("cannot be empty");
    expect(setupRecords.map(({ phase }) => phase)).toEqual([
      "started",
      "started",
      "failed",
      "failed",
    ]);
    releaseSetup();

    const controller = new AbortController();
    const cancellationFailure = new Error("cancelled during request setup");
    Object.defineProperty(instance.state, "pending", {
      configurable: true,
      set: () => {
        controller.abort("request setup cancelled");
        throw cancellationFailure;
      },
    });
    const action = instance.run(
      $.star.get("/cancelled-setup", {
        pending: "pending",
        requestCancellation: controller,
      }),
    );
    await expect(action).rejects.toBe(cancellationFailure);
  });

  it("validates observer inputs and kind filters", () => {
    expect(() => $.star.observeOperations(null as never)).toThrow(
      "An operation observer must be a function.",
    );
    expect(() => $.star.observeOperations(vi.fn(), { kinds: [] })).toThrow(
      "Operation subscription kinds must be a non-empty array.",
    );
    expect(() => $.star.observeOperations(vi.fn(), { kinds: ["unknown" as never] })).toThrow(
      "Unknown operation kind: unknown.",
    );
    expect(() => $.star.observeOperations(vi.fn(), { onError: "bad" as never })).toThrow(
      "An operation observer onError handler must be a function.",
    );
  });
});

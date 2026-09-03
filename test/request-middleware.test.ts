import { describe, expect, it, vi } from "vitest";
import {
  executeRequestMiddleware,
  normalizeRequestDescriptor,
  RequestMiddlewareRegistry,
  StarRequestMiddlewareNextError,
  StarRequestMiddlewareValidationError,
  validateRequestDescriptorPolicy,
  type RequestMiddlewareDispatchSettlement,
  type StarPluginRequestMiddlewareSet,
  type StarRequestDescriptor,
  type StarRequestMiddleware,
  type StarRequestMiddlewareOutcome,
} from "../src/request-middleware";
import type { StarContext, StarInstance } from "../src/types";

interface Harness {
  readonly context: StarContext;
  readonly controller: AbortController;
  readonly descriptor: StarRequestDescriptor;
  readonly instance: StarInstance;
  readonly registry: RequestMiddlewareRegistry;
}

function application(root: Element): StarInstance {
  return {
    mode: "behavior",
    root,
    $root: {} as JQuery<Element>,
    state: {},
    computed: {},
    destroyed: false,
    observeOperations: () => () => undefined,
    run: async () => undefined,
    refresh: () => undefined,
    destroy: () => undefined,
  };
}

function harness(): Harness {
  const root = document.createElement("main");
  root.innerHTML = '<form id="form"></form><section id="target"></section>';
  const registry = new RequestMiddlewareRegistry();
  const instance = application(root);
  registry.trackApplication(instance);
  const context: StarContext = {
    $: {} as JQueryStatic,
    state: instance.state,
    computed: instance.computed,
    root,
    $root: instance.$root,
    instance,
  };
  const descriptor = normalizeRequestDescriptor({
    schema: "jquery-star-request/1",
    operationId: "operation-1",
    method: "POST",
    url: "https://example.test/original?keep=yes",
    headers: [
      ["Accept", "application/json"],
      ["Content-Type", "application/json"],
      ["Datastar-Request", "true"],
      ["X-Authored", "keep"],
    ],
    credentials: "same-origin",
    body: { kind: "json", size: 12 },
    target: "#target",
    selector: "#form",
    mode: "inner",
    profile: "core.datastar",
  });
  return { context, controller: new AbortController(), descriptor, instance, registry };
}

function install(
  registry: RequestMiddlewareRegistry,
  registrations: readonly StarPluginRequestMiddlewareSet[],
): void {
  registry.preparePluginInstall(registrations).commit();
}

function registration(
  namespace: string,
  middleware: readonly {
    readonly id: string;
    readonly before?: readonly string[];
    readonly after?: readonly string[];
    readonly handle: StarRequestMiddleware;
  }[],
): StarPluginRequestMiddlewareSet {
  return { namespace, middleware };
}

function rejectUnknown(value: unknown): PromiseLike<never> {
  return {
    then(_resolve: unknown, reject?: (reason: unknown) => unknown) {
      reject?.(value);
    },
  } as unknown as PromiseLike<never>;
}

async function execute<Value = string>(
  current: Harness,
  dispatch: (
    descriptor: StarRequestDescriptor,
  ) => Promise<RequestMiddlewareDispatchSettlement<Value>> = async () => ({
    phase: "completed",
    value: "response" as Value,
    status: 204,
  }),
) {
  return executeRequestMiddleware(
    current.context,
    current.descriptor,
    current.controller.signal,
    () => "aborted",
    dispatch,
  );
}

describe("request middleware registry", () => {
  it("uses stable registration ties and explicit before/after constraints", async () => {
    const current = harness();
    const calls: string[] = [];
    const records = [
      registration("acme.alpha", [
        {
          id: "first",
          after: ["acme.beta.second"],
          handle: async (_request, next, context) => {
            calls.push(`enter:${context.id}`);
            const outcome = await next();
            calls.push(`exit:${context.id}`);
            return outcome;
          },
        },
      ]),
      registration("acme.beta", [
        {
          id: "second",
          handle: async (_request, next, context) => {
            calls.push(`enter:${context.id}`);
            const outcome = await next();
            calls.push(`exit:${context.id}`);
            return outcome;
          },
        },
      ]),
      registration("acme.gamma", [
        {
          id: "third",
          before: ["acme.alpha.first"],
          handle: async (_request, next, context) => {
            calls.push(`enter:${context.id}`);
            const outcome = await next();
            calls.push(`exit:${context.id}`);
            return outcome;
          },
        },
      ]),
    ];
    install(current.registry, records);

    await execute(current, async () => {
      calls.push("dispatch");
      return { phase: "completed", value: "ok", status: 200 };
    });

    expect(calls).toEqual([
      "enter:acme.beta.second",
      "enter:acme.gamma.third",
      "enter:acme.alpha.first",
      "dispatch",
      "exit:acme.alpha.first",
      "exit:acme.gamma.third",
      "exit:acme.beta.second",
    ]);
  });

  it("validates registrations and rejects duplicate, missing, self, conflicting, and cyclic order", () => {
    const noop: StarRequestMiddleware = (_request, _next, context) => context.complete();

    const invalid: Array<readonly [string, readonly StarPluginRequestMiddlewareSet[], string]> = [
      [
        "plugin namespace",
        [{ namespace: "invalid", middleware: [] }],
        "Invalid request middleware plugin namespace",
      ],
      [
        "middleware collection",
        [{ namespace: "acme.test", middleware: null } as unknown as StarPluginRequestMiddlewareSet],
        "must be an array",
      ],
      [
        "definition object",
        [
          {
            namespace: "acme.test",
            middleware: [null],
          } as unknown as StarPluginRequestMiddlewareSet,
        ],
        "must be objects",
      ],
      ["local ID", [registration("acme.test", [{ id: "Bad", handle: noop }])], "lowercase"],
      [
        "handle",
        [
          registration("acme.test", [
            { id: "one", handle: null as unknown as StarRequestMiddleware },
          ]),
        ],
        "needs a handle",
      ],
      [
        "constraint collection",
        [
          registration("acme.test", [
            {
              id: "one",
              before: "acme.other.two" as unknown as readonly string[],
              handle: noop,
            },
          ]),
        ],
        "must be an array",
      ],
      [
        "qualified constraint",
        [registration("acme.test", [{ id: "one", before: ["local"], handle: noop }])],
        "fully qualified",
      ],
      [
        "duplicate constraint",
        [
          registration("acme.test", [
            {
              id: "one",
              before: ["acme.other.two", "acme.other.two"],
              handle: noop,
            },
          ]),
          registration("acme.other", [{ id: "two", handle: noop }]),
        ],
        "duplicate target",
      ],
      [
        "duplicate local ID",
        [
          registration("acme.test", [
            { id: "one", handle: noop },
            { id: "one", handle: noop },
          ]),
        ],
        "Duplicate request middleware ID",
      ],
      [
        "missing target",
        [registration("acme.test", [{ id: "one", before: ["acme.missing.two"], handle: noop }])],
        "unknown before target",
      ],
      [
        "missing after target",
        [registration("acme.test", [{ id: "one", after: ["acme.missing.two"], handle: noop }])],
        "unknown after target",
      ],
      [
        "self target",
        [registration("acme.test", [{ id: "one", after: ["acme.test.one"], handle: noop }])],
        "cannot order itself",
      ],
      [
        "conflicting target",
        [
          registration("acme.test", [
            {
              id: "one",
              before: ["acme.other.two"],
              after: ["acme.other.two"],
              handle: noop,
            },
          ]),
          registration("acme.other", [{ id: "two", handle: noop }]),
        ],
        "both before and after",
      ],
      [
        "cycle",
        [
          registration("acme.test", [{ id: "one", before: ["acme.other.two"], handle: noop }]),
          registration("acme.other", [{ id: "two", before: ["acme.test.one"], handle: noop }]),
        ],
        "contains a cycle",
      ],
    ];

    for (const [, records, message] of invalid) {
      const registry = new RequestMiddlewareRegistry();
      expect(() => registry.preparePluginInstall(records)).toThrow(message);
      registry.dispose();
    }

    const duplicate = new RequestMiddlewareRegistry();
    const first = registration("acme.test", [{ id: "one", handle: noop }]);
    install(duplicate, [first]);
    expect(() => duplicate.preparePluginInstall([first])).toThrow(
      "Duplicate request middleware ID",
    );
    duplicate.dispose();
  });

  it("keeps prepared definitions invisible until commit and removes them exactly once", async () => {
    const current = harness();
    const middleware = vi.fn<StarRequestMiddleware>(async (_request, next) => next());
    const prepared = current.registry.preparePluginInstall([
      registration("acme.test", [{ id: "one", handle: middleware }]),
    ]);
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "ok",
      status: 200,
    }));

    await execute(current, dispatch);
    expect(middleware).not.toHaveBeenCalled();

    prepared.commit();
    await execute(current, dispatch);
    expect(middleware).toHaveBeenCalledOnce();

    const cleanup = prepared.cleanups.get("acme.test")!;
    cleanup();
    cleanup();
    await execute(current, dispatch);
    expect(middleware).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  it("rolls a prepared definition set back idempotently before commit", async () => {
    const current = harness();
    const middleware = vi.fn<StarRequestMiddleware>((_request, _next, context) =>
      context.complete(),
    );
    const prepared = current.registry.preparePluginInstall([
      registration("acme.rollback", [{ id: "one", handle: middleware }]),
    ]);

    prepared.rollback();
    prepared.rollback();
    await execute(current);

    expect(middleware).not.toHaveBeenCalled();
    expect(current.registry.snapshot()).toEqual([]);
  });
});

describe("request middleware composition", () => {
  it("freezes descriptors and permits same-origin URL and ordinary header additions", async () => {
    const current = harness();
    const seen: StarRequestDescriptor[] = [];
    install(current.registry, [
      registration("acme.headers", [
        {
          id: "correlate",
          async handle(this: void, request, next, context) {
            expect(this).toBeUndefined();
            seen.push(request);
            expect(Object.isFrozen(request)).toBe(true);
            expect(Object.isFrozen(request.headers)).toBe(true);
            expect(request.headers.every(Object.isFrozen)).toBe(true);
            expect(Object.isFrozen(request.body)).toBe(true);
            expect(Object.isFrozen(context)).toBe(true);
            expect(context.signal).toBe(current.controller.signal);
            return next({
              ...request,
              url: "https://example.test/changed?query=allowed",
              headers: [...request.headers, ["X-Correlation-ID", "request-1"]],
            });
          },
        },
      ]),
    ]);
    const dispatch = vi.fn(async (request: StarRequestDescriptor) => ({
      phase: "completed" as const,
      value: request.url,
      status: 200,
    }));

    const result = await execute(current, dispatch);

    expect(result).toMatchObject({
      phase: "completed",
      source: "dispatch",
      value: "https://example.test/changed?query=allowed",
    });
    const dispatched = dispatch.mock.calls[0]![0];
    expect(new Map(dispatched.headers).get("x-correlation-id")).toBe("request-1");
    expect(seen).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(dispatched))).toEqual(dispatched);
  });

  it("supports branded short-circuit success and explicit cancellation without dispatch", async () => {
    const completed = harness();
    install(completed.registry, [
      registration("acme.cache", [
        { id: "hit", handle: (_request, _next, context) => context.complete() },
      ]),
    ]);
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "network",
      status: 200,
    }));

    await expect(execute(completed, dispatch)).resolves.toMatchObject({
      phase: "completed",
      source: "middleware",
    });
    expect(dispatch).not.toHaveBeenCalled();

    const cancelled = harness();
    install(cancelled.registry, [
      registration("acme.guard", [
        { id: "cancel", handle: (_request, _next, context) => context.cancel() },
      ]),
    ]);
    await expect(execute(cancelled, dispatch)).resolves.toMatchObject({
      phase: "cancelled",
      source: "middleware",
      reason: "aborted",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects forged, stale, and substituted downstream outcomes", async () => {
    const forged = harness();
    install(forged.registry, [
      registration("acme.forge", [
        {
          id: "literal",
          handle: () => ({ phase: "completed", source: "middleware" }),
        },
      ]),
    ]);
    await expect(execute(forged)).rejects.toBeInstanceOf(StarRequestMiddlewareValidationError);

    let stale: StarRequestMiddlewareOutcome | undefined;
    const first = harness();
    install(first.registry, [
      registration("acme.stale", [
        {
          id: "capture",
          handle: (_request, _next, context) => {
            stale ??= context.complete();
            return stale;
          },
        },
      ]),
    ]);
    await expect(execute(first)).resolves.toMatchObject({ source: "middleware" });
    await expect(execute(first)).rejects.toThrow("forged or stale");

    const substitute = harness();
    install(substitute.registry, [
      registration("acme.substitute", [
        {
          id: "copy",
          handle: async (_request, next) => {
            const outcome = await next();
            return { ...outcome };
          },
        },
      ]),
    ]);
    await expect(execute(substitute)).rejects.toThrow("exact outcome");
  });

  it("guards duplicate and late next calls without a second dispatch", async () => {
    const duplicate = harness();
    install(duplicate.registry, [
      registration("acme.next", [
        {
          id: "twice",
          handle: async (_request, next) => {
            const outcome = await next();
            await next();
            return outcome;
          },
        },
      ]),
    ]);
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "ok",
      status: 200,
    }));
    await expect(execute(duplicate, dispatch)).rejects.toBeInstanceOf(
      StarRequestMiddlewareNextError,
    );
    expect(dispatch).toHaveBeenCalledOnce();

    const late = harness();
    let lateNext: (() => Promise<StarRequestMiddlewareOutcome>) | undefined;
    install(late.registry, [
      registration("acme.late", [
        {
          id: "later",
          handle: (_request, next, context) => {
            lateNext = next;
            return context.complete();
          },
        },
      ]),
    ]);
    await execute(late, dispatch);
    expect(() => lateNext!()).toThrow(StarRequestMiddlewareNextError);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("preserves middleware and downstream failure identity while exposing inert outcomes", async () => {
    const middlewareFailure = harness();
    const original = { source: "middleware" };
    install(middlewareFailure.registry, [
      registration("acme.failure", [
        {
          id: "reject",
          handle: () => rejectUnknown(original),
        },
      ]),
    ]);
    await expect(execute(middlewareFailure)).rejects.toBe(original);

    const downstreamFailure = harness();
    const seen: StarRequestMiddlewareOutcome[] = [];
    install(downstreamFailure.registry, [
      registration("acme.observe", [
        {
          id: "failure",
          handle: async (_request, next) => {
            const outcome = await next();
            seen.push(outcome);
            return outcome;
          },
        },
      ]),
    ]);
    const networkError = new Error("private network error");
    await expect(
      execute(downstreamFailure, async () => {
        throw networkError;
      }),
    ).rejects.toBe(networkError);
    expect(seen).toEqual([
      {
        phase: "failed",
        source: "dispatch",
        error: { name: "Error", message: "private network error" },
      },
    ]);
    expect(Object.isFrozen(seen[0])).toBe(true);
    expect(JSON.stringify(seen)).not.toContain("stack");
  });

  it("normalizes primitive, bounded, and hostile middleware errors without replacing them", async () => {
    const failures: unknown[] = ["plain failure"];
    const bounded = new Error(`${"x".repeat(1_100)}\u0000`);
    bounded.name = `${"N".repeat(140)}\u0001`;
    failures.push(bounded);
    const hostile = new Error("hidden");
    Object.defineProperties(hostile, {
      name: {
        get() {
          throw new Error("name getter failed");
        },
      },
      message: {
        get() {
          throw new Error("message getter failed");
        },
      },
    });
    failures.push(hostile);

    for (const failure of failures) {
      const current = harness();
      const seen: StarRequestMiddlewareOutcome[] = [];
      install(current.registry, [
        registration("acme.outer", [
          {
            id: "observe",
            async handle(_request, next) {
              const outcome = await next();
              seen.push(outcome);
              return outcome;
            },
          },
        ]),
        registration("acme.inner", [{ id: "fail", handle: () => rejectUnknown(failure) }]),
      ]);

      await expect(execute(current)).rejects.toBe(failure);
      expect(seen[0]).toMatchObject({ phase: "failed", source: "middleware" });
      if (seen[0]?.phase !== "failed") throw new Error("Expected a failed middleware outcome.");
      expect(seen[0].error.name.length).toBeLessThanOrEqual(120);
      expect(seen[0].error.message.length).toBeLessThanOrEqual(1_024);
      const serialized = JSON.stringify(seen[0]);
      expect(serialized).not.toContain(String.fromCharCode(0));
      expect(serialized).not.toContain(String.fromCharCode(1));
    }
  });

  it("detaches unsettled middleware on abort and blocks its late continuation", async () => {
    const current = harness();
    let continueMiddleware: ((outcome: StarRequestMiddlewareOutcome) => void) | undefined;
    let capturedNext: (() => Promise<StarRequestMiddlewareOutcome>) | undefined;
    install(current.registry, [
      registration("acme.slow", [
        {
          id: "wait",
          handle: (_request, next) => {
            capturedNext = next;
            return new Promise<StarRequestMiddlewareOutcome>((resolve) => {
              continueMiddleware = resolve;
            });
          },
        },
      ]),
    ]);
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "network",
      status: 200,
    }));
    const pending = execute(current, dispatch);
    await vi.waitFor(() => expect(capturedNext).toBeTypeOf("function"));

    current.controller.abort("cleanup");
    await expect(pending).resolves.toMatchObject({
      phase: "cancelled",
      source: "request",
      reason: "aborted",
    });
    expect(() => capturedNext!()).toThrow(StarRequestMiddlewareNextError);
    expect(dispatch).not.toHaveBeenCalled();

    continueMiddleware!({
      phase: "completed",
      source: "middleware",
    });
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("request middleware policy", () => {
  it.each([
    ["origin", { url: "https://other.test/path" }, "origin"],
    ["fragment", { url: "https://example.test/original?keep=yes#changed" }, "fragment"],
    ["operation ID", { operationId: "forged" }, "operation ID"],
    ["method", { method: "GET" }, "method"],
    ["credentials", { credentials: "include" }, "credential"],
    ["body kind", { body: { kind: "multipart" } }, "body metadata"],
    ["profile", { profile: "core.generic" }, "request profile"],
    ["target", { target: "#other" }, "response target"],
    ["selector", { selector: "#other" }, "form selector"],
    ["patch mode", { mode: "outer" }, "patch mode"],
  ])("rejects a changed authored %s before dispatch", async (_label, change, message) => {
    const current = harness();
    install(current.registry, [
      registration("acme.policy", [
        {
          id: "change",
          handle: (request, next) => next({ ...request, ...change } as StarRequestDescriptor),
        },
      ]),
    ]);
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "network",
      status: 200,
    }));

    await expect(execute(current, dispatch)).rejects.toThrow(message);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects URL credentials, invalid selectors, header replacement, and browser-owned headers", async () => {
    const changes: Array<readonly [Partial<StarRequestDescriptor>, string]> = [
      [{ url: "https://user:secret@example.test/path" }, "cannot contain credentials"],
      [{ target: "[invalid" }, "response target"],
      [
        {
          headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ["Datastar-Request", "true"],
          ],
        },
        "remove or replace",
      ],
      [
        {
          headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ["Datastar-Request", "true"],
            ["X-Authored", "keep"],
            ["Cookie", "private"],
          ],
        },
        "browser-owned header",
      ],
    ];

    for (const [change, message] of changes) {
      const current = harness();
      install(current.registry, [
        registration("acme.policy", [
          {
            id: "change",
            handle: (request, next) => next({ ...request, ...change }),
          },
        ]),
      ]);
      const dispatch = vi.fn(async () => ({
        phase: "completed" as const,
        value: "network",
        status: 200,
      }));
      await expect(execute(current, dispatch)).rejects.toThrow(message);
      expect(dispatch).not.toHaveBeenCalled();
      current.registry.dispose();
    }
  });

  it("rejects invalid descriptor shapes and aborted dispatch", async () => {
    const base = harness().descriptor;
    const malformed: Array<readonly [unknown, string]> = [
      [null, "descriptor object"],
      [{ ...base, extra: document.body }, "unsupported property"],
      [{ ...base, schema: "other" }, "schema"],
      [{ ...base, operationId: "" }, "operation ID"],
      [{ ...base, method: "OPTIONS" }, "method"],
      [{ ...base, url: 1 }, "URL string"],
      [{ ...base, url: "/relative" }, "absolute"],
      [{ ...base, headers: null }, "header tuple array"],
      [
        { ...base, headers: Array.from({ length: 201 }, () => ["X-Test", "value"]) },
        "too many headers",
      ],
      [{ ...base, headers: [["X-Test"]] }, "name/value tuples"],
      [{ ...base, headers: [[1, "value"]] }, "names and values must be strings"],
      [{ ...base, headers: [["X".repeat(257), "value"]] }, "bounded metadata"],
      [{ ...base, headers: [["X-Test", "line\nbreak"]] }, "invalid header"],
      [{ ...base, credentials: "cross-origin" }, "credential mode"],
      [{ ...base, profile: "other" }, "profile"],
      [{ ...base, target: 1 }, "target must be a string"],
      [{ ...base, selector: 1 }, "selector must be a string"],
      [{ ...base, mode: "around" }, "patch mode"],
      [{ ...base, body: null }, "body metadata"],
      [{ ...base, body: { kind: "json", content: "private" } }, "unsupported property"],
      [{ ...base, body: { kind: "stream" } }, "body kind"],
      [{ ...base, body: { kind: "json", size: -1 } }, "bounded non-negative integer"],
    ];
    for (const [value, message] of malformed) {
      expect(() => normalizeRequestDescriptor(value)).toThrow(message);
    }

    const current = harness();
    current.controller.abort();
    const dispatch = vi.fn(async () => ({
      phase: "completed" as const,
      value: "network",
      status: 200,
    }));
    await expect(execute(current, dispatch)).resolves.toMatchObject({
      phase: "cancelled",
      source: "request",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a newly added protected header even when no authored value existed", () => {
    const root = document.createElement("main");
    const authored = normalizeRequestDescriptor({
      schema: "jquery-star-request/1",
      operationId: "operation-header",
      method: "GET",
      url: "https://example.test/path",
      headers: [
        ["Accept", "application/json"],
        ["Datastar-Request", "true"],
      ],
      credentials: "same-origin",
      body: { kind: "none" },
      profile: "core.datastar",
    });
    const candidate = normalizeRequestDescriptor({
      ...authored,
      headers: [...authored.headers, ["Content-Type", "text/plain"]],
    });

    expect(() => validateRequestDescriptorPolicy(authored, candidate, root)).toThrow(
      "protected header content-type",
    );
  });

  it("rejects an invalid selector already present on the authored request", () => {
    const root = document.createElement("main");
    const authored = normalizeRequestDescriptor({
      ...harness().descriptor,
      target: "[invalid",
    });

    expect(() => validateRequestDescriptorPolicy(authored, authored, root)).toThrow(
      "response target is not a valid scoped selector",
    );
  });
});

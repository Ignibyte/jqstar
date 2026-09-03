import fc from "fast-check";
import { expect, it, vi } from "vitest";
import {
  executeRequestMiddleware,
  normalizeRequestDescriptor,
  RequestMiddlewareRegistry,
  type StarRequestDescriptor,
  type StarRequestMiddlewareDefinition,
} from "../../src/request-middleware";
import type { StarContext, StarInstance } from "../../src/types";
import { assertAsyncProperty } from "./helpers";

function application(): StarInstance {
  const root = document.createElement("main");
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

function context(instance: StarInstance): StarContext {
  return {
    $: {} as JQueryStatic,
    state: instance.state,
    computed: instance.computed,
    root: instance.root,
    $root: instance.$root,
    instance,
  };
}

function descriptor(): StarRequestDescriptor {
  return normalizeRequestDescriptor({
    schema: "jquery-star-request/1",
    operationId: "operation-generated",
    method: "GET",
    url: "https://example.test/start",
    headers: [
      ["Accept", "application/json"],
      ["Datastar-Request", "true"],
    ],
    credentials: "same-origin",
    body: { kind: "none" },
    profile: "core.datastar",
  });
}

async function run(
  registry: RequestMiddlewareRegistry,
  instance: StarInstance,
  dispatch: (request: StarRequestDescriptor) => Promise<{
    readonly phase: "completed";
    readonly value: string;
    readonly status: number;
  }>,
) {
  return executeRequestMiddleware(
    context(instance),
    descriptor(),
    new AbortController().signal,
    () => "aborted",
    dispatch,
  );
}

it("respects every edge in generated acyclic middleware orders", async () => {
  await assertAsyncProperty(
    "request-middleware-acyclic-order",
    fc.asyncProperty(
      fc.integer({ min: 1, max: 12 }),
      fc.array(fc.tuple(fc.integer({ min: 0, max: 11 }), fc.integer({ min: 0, max: 11 })), {
        maxLength: 30,
      }),
      async (length, candidates) => {
        const edges = Array.from(
          new Map(
            candidates
              .filter(([from, to]) => from < length && to < length && from < to)
              .map(([from, to]) => [`${from}:${to}`, [from, to] as const]),
          ).values(),
        );
        const calls: string[] = [];
        const definitions: StarRequestMiddlewareDefinition[] = Array.from(
          { length },
          (_value, index) => ({
            id: `m${index}`,
            before: edges
              .filter(([from]) => from === index)
              .map(([, to]) => `acme.generated.m${to}`),
            async handle(_request, next, middlewareContext) {
              calls.push(middlewareContext.id);
              return next();
            },
          }),
        );
        const registry = new RequestMiddlewareRegistry();
        const instance = application();
        registry.trackApplication(instance);
        registry
          .preparePluginInstall([{ namespace: "acme.generated", middleware: definitions }])
          .commit();
        const dispatch = vi.fn(async () => ({
          phase: "completed" as const,
          value: "ok",
          status: 204,
        }));

        await run(registry, instance, dispatch);

        expect(calls).toHaveLength(length);
        expect(new Set(calls).size).toBe(length);
        const positions = new Map(calls.map((id, index) => [id, index]));
        for (const [from, to] of edges) {
          expect(positions.get(`acme.generated.m${from}`)!).toBeLessThan(
            positions.get(`acme.generated.m${to}`)!,
          );
        }
        expect(dispatch).toHaveBeenCalledOnce();
        registry.dispose();
      },
    ),
  );
});

it("keeps generated descriptor edits and short circuits to at most one dispatch", async () => {
  await assertAsyncProperty(
    "request-middleware-edit-dispatch-uniqueness",
    fc.asyncProperty(
      fc.array(fc.stringMatching(/^[a-z0-9]{0,12}$/), { maxLength: 12 }),
      fc.integer({ min: -1, max: 12 }),
      async (values, requestedShortCircuit) => {
        const shortCircuit =
          requestedShortCircuit >= 0 && requestedShortCircuit < values.length
            ? requestedShortCircuit
            : -1;
        const entered: number[] = [];
        const definitions: StarRequestMiddlewareDefinition[] = values.map((value, index) => ({
          id: `edit${index}`,
          async handle(request, next, middlewareContext) {
            entered.push(index);
            if (index === shortCircuit) return middlewareContext.complete();
            return next({
              ...request,
              url: `https://example.test/path-${index}?value=${encodeURIComponent(value)}`,
              headers: [...request.headers, [`X-Generated-${index}`, value || "empty"]],
            });
          },
        }));
        const registry = new RequestMiddlewareRegistry();
        const instance = application();
        registry.trackApplication(instance);
        registry
          .preparePluginInstall([{ namespace: "acme.generated", middleware: definitions }])
          .commit();
        const dispatched: StarRequestDescriptor[] = [];
        const dispatch = vi.fn(async (request: StarRequestDescriptor) => {
          dispatched.push(request);
          return { phase: "completed" as const, value: request.url, status: 200 };
        });

        const result = await run(registry, instance, dispatch);

        const expectedEntered = shortCircuit >= 0 ? shortCircuit + 1 : values.length;
        expect(entered).toEqual(Array.from({ length: expectedEntered }, (_value, index) => index));
        expect(dispatch).toHaveBeenCalledTimes(shortCircuit >= 0 ? 0 : 1);
        expect(result.source).toBe(shortCircuit >= 0 ? "middleware" : "dispatch");
        if (dispatched[0]) {
          expect(Object.isFrozen(dispatched[0])).toBe(true);
          expect(JSON.parse(JSON.stringify(dispatched[0]))).toEqual(dispatched[0]);
          if (values.length > 0) {
            expect(new URL(dispatched[0].url).pathname).toBe(`/path-${values.length - 1}`);
            const headers = new Map(dispatched[0].headers);
            for (const [index, value] of values.entries()) {
              expect(headers.get(`x-generated-${index}`)).toBe(value || "empty");
            }
          }
        }

        registry.releaseApplication(instance);
        entered.length = 0;
        await run(registry, instance, dispatch);
        expect(entered).toEqual([]);
        registry.dispose();
      },
    ),
  );
});

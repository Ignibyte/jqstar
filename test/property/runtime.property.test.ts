import fc from "fast-check";
import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearExpressionCache, compileStatement, compileValue } from "../../src/expression";
import { executeBackendRequest } from "../../src/fetch";
import { patchSignals } from "../../src/patch";
import { datastarProtocolProfile } from "../../src/protocol-datastar";
import { genericProtocolProfile } from "../../src/protocol-generic";
import { ProtocolProfileRegistry } from "../../src/protocol";
import { effect, nextUpdate, reactive, stop } from "../../src/reactivity";
import type { StarContext } from "../../src/types";
import { assertAsyncProperty, assertProperty } from "./helpers";
import regressions from "./regressions.json";

const identifier = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"),
  minLength: 1,
  maxLength: 12,
});
const reservedExpressionSignals = new Set(
  regressions["expression-reserved-context-domain"].excluded,
);
const signalIdentifier = identifier.filter((name) => !reservedExpressionSignals.has(name));
const jsonRecord = fc.dictionary(identifier, fc.jsonValue(), { maxKeys: 8 });

function expectedPublicSignals(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("_")) continue;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      const nested = expectedPublicSignals(child) as Record<string, unknown>;
      if (Object.keys(nested).length > 0) result[key] = nested;
    } else {
      result[key] = child;
    }
  }
  return result;
}

function context(state: Record<string, unknown>): StarContext {
  const root = document.createElement("section");
  document.body.append(root);
  return {
    $,
    state,
    computed: {},
    root,
    $root: $(root),
    element: root,
    $element: $(root),
    instance: {} as StarContext["instance"],
  };
}

async function executeDatastarRequest(
  state: Record<string, unknown>,
  capture: (url: URL) => void,
): Promise<void> {
  const current = context(state);
  const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
  registry.trackApplication(current.instance);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL) => {
      capture(url);
      return new Response("{}", { headers: { "Content-Type": "application/json" } });
    }),
  );
  try {
    await executeBackendRequest(
      "GET",
      "/property",
      { profile: "core.datastar", retry: "never" },
      current,
    );
  } finally {
    registry.releaseApplication(current.instance);
    registry.dispose();
  }
}

function throwForeignValue(value: unknown): never {
  const iterator = (function* () {
    yield undefined;
  })();
  iterator.next();
  iterator.throw(value);
  throw new Error("Generator.throw unexpectedly returned.");
}

afterEach(() => {
  document.body.innerHTML = "";
  clearExpressionCache();
  vi.unstubAllGlobals();
});

describe("runtime pure-contract properties", () => {
  it("normalizes non-Error expression failures", () => {
    const evaluate = compileValue('(() => { throw "plain expression failure"; })()');
    expect(() => evaluate(context({}))).toThrow(/plain expression failure/);
  });

  it("normalizes statement context failures through the compatibility engine", () => {
    const current = context({});
    Object.defineProperty(current, "state", {
      get() {
        return throwForeignValue("statement context failure");
      },
    });
    const evaluate = compileStatement("state.count += 1");

    expect(() => evaluate(current)).toThrow(/statement context failure/);
  });

  it("maps every generated non-reserved $name expression to the matching signal", () => {
    assertProperty(
      "expression-signal-name",
      fc.property(signalIdentifier, fc.integer(), fc.integer(), (name, value, offset) => {
        const compiled = compileValue(`$${name} + (${offset})`);
        expect(compiled(context({ [name]: value }))).toBe(value + offset);
      }),
    );
  });

  it("applies JSON signal patches idempotently without retaining patch objects", () => {
    assertProperty(
      "signal-patch-idempotence",
      fc.property(jsonRecord, jsonRecord, (initial, patch) => {
        const state = structuredClone(initial) as Record<string, unknown>;
        const source = structuredClone(patch) as Record<string, unknown>;
        patchSignals(state, source);
        const once = structuredClone(state);
        patchSignals(state, source);
        expect(state).toEqual(once);
        expect(state).not.toBe(source);
      }),
    );
  });

  it("batches overlapping writes and stops scheduled ownership exactly once", async () => {
    await assertAsyncProperty(
      "reactivity-batching-disposal",
      fc.asyncProperty(fc.array(fc.integer(), { minLength: 1, maxLength: 30 }), async (updates) => {
        const state = reactive({ value: 0 });
        const observed: number[] = [];
        const runner = effect(() => observed.push(state.value));
        let changed = false;
        let previous = 0;
        for (const value of updates) {
          if (!Object.is(previous, value)) changed = true;
          state.value = value;
          previous = value;
        }
        await nextUpdate();
        expect(observed).toEqual(changed ? [0, updates.at(-1)] : [0]);
        stop(runner);
        stop(runner);
        state.value += 1;
        await nextUpdate();
        expect(observed).toHaveLength(changed ? 2 : 1);
      }),
    );
  });

  it("encodes generated public signal records according to the filtering contract", async () => {
    await assertAsyncProperty(
      "request-signal-encoding",
      fc.asyncProperty(jsonRecord, async (state) => {
        let requestURL: URL | undefined;
        await executeDatastarRequest(state, (url) => {
          requestURL = url;
        });
        expect(JSON.parse(requestURL?.searchParams.get("datastar") ?? "null")).toEqual(
          expectedPublicSignals(state),
        );
      }),
      { numRuns: 30 },
    );
  });

  it("permanently replays the generated empty-object filtering counterexample", async () => {
    const regression = regressions["request-filter-empty-object"];
    let requestURL: URL | undefined;
    await executeDatastarRequest(regression.counterexample, (url) => {
      requestURL = url;
    });
    expect(JSON.parse(requestURL?.searchParams.get("datastar") ?? "null")).toEqual(
      regression.encoded,
    );
  });

  it("permanently replays a public signal name containing dot-underscore", async () => {
    const regression = regressions["request-filter-dotted-public-name"];
    let requestURL: URL | undefined;
    await executeDatastarRequest(regression.counterexample, (url) => {
      requestURL = url;
    });
    expect(JSON.parse(requestURL?.searchParams.get("datastar") ?? "null")).toEqual(
      regression.encoded,
    );
  });
});

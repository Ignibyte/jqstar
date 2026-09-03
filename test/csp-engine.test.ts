import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import $ from "jquery";
import { describe, expect, it, vi } from "vitest";
import {
  CSP_DIAGNOSTICS,
  CSP_LIMITS,
  CSP_METHODS,
  CSP_NODE_KINDS,
  CSP_PRODUCTIONS,
  CSP_TOKEN_KINDS,
} from "../src/csp/contract";
import {
  CSP_CACHE_LIMITS,
  createCSPExpressionEngine as createSourceCSPExpressionEngine,
} from "../src/csp/engine";
import { isStarCSPExpressionError } from "../src/csp/diagnostics";
import { evaluateCSP } from "../src/csp/evaluator";
import type { CSPExpressionNode } from "../src/csp/ast";
import {
  bindStarExpressionRuntime,
  type StarExpressionRuntimeBinding,
} from "../src/expression-runtime";
import { DeclarativeApplication } from "../src/declarative";
import { Kernel } from "../src/kernel";
import type { ActionOperation } from "../src/observation";
import { nextUpdate } from "../src/reactivity";
import type { StarAction, StarContext, StarInstance } from "../src/types";

const installedCSPEntry = process.env.JQS_CSP_PACKED_ENTRY;
const createCSPExpressionEngine = installedCSPEntry
  ? ((await import(pathToFileURL(resolve(installedCSPEntry)).href))
      .createCSPExpressionEngine as typeof createSourceCSPExpressionEngine)
  : createSourceCSPExpressionEngine;

interface AcceptedCase {
  readonly id: string;
  readonly entryKind: "statement" | "value";
  readonly source: string;
  readonly fixture?: string;
  readonly expected: {
    readonly calls?: readonly { readonly target: string; readonly arguments: readonly unknown[] }[];
    readonly outcome: string;
    readonly state?: Record<string, unknown>;
    readonly value?: unknown;
  };
}

interface RejectedCase {
  readonly id: string;
  readonly entryKind: "statement" | "value";
  readonly source: string;
  readonly fixture?: string;
  readonly diagnostic: {
    readonly code: string;
    readonly phase: "compile" | "evaluate";
    readonly span: Record<string, number>;
  };
}

async function acceptedCases(): Promise<readonly AcceptedCase[]> {
  const input = await readFile(resolve("test/fixtures/csp/accepted.json"), "utf8");
  return (JSON.parse(input) as { readonly cases: readonly AcceptedCase[] }).cases;
}

async function rejectedCases(name: "adversarial" | "denied"): Promise<readonly RejectedCase[]> {
  const input = await readFile(resolve(`test/fixtures/csp/${name}.json`), "utf8");
  return (JSON.parse(input) as { readonly cases: readonly RejectedCase[] }).cases;
}

function harness(fixture?: string, actionOverrides: Readonly<Record<string, StarAction>> = {}) {
  const root = document.createElement("main");
  root.id = "app";
  root.setAttribute("data-jqs", "");
  const label = document.createElement("span");
  label.dataset.part = "label";
  label.textContent = "Ready";
  const element = document.createElement("input");
  element.dataset.role = "save";
  element.value = "save";
  root.append(label, element);
  const collectionSize =
    fixture === "collection-129" ? 129 : fixture === "collection-128" ? 128 : 0;
  for (let index = 0; index < collectionSize; index += 1) {
    const child = document.createElement("i");
    child.className = "item";
    root.append(child);
  }

  const state: Record<string, unknown> = {
    count: 2,
    name: " Ada ",
    profile: { name: "Ada" },
  };
  let accessorReads = 0;
  let operationActive = true;
  let operationCompletions = 0;
  let operationFailures = 0;
  let proxyTrapCalls = 0;
  let thenCalls = 0;
  if (fixture === "state-value") state.value = { safe: true };
  if (fixture === "state-cycle") state.self = state;
  if (fixture === "state-function") state.fn = () => null;
  if (fixture === "state-html") state.html = "<strong>unsafe</strong>";
  if (fixture === "state-selector") state.selector = ".item";
  if (fixture === "response-function-shape") state.response = { callback: () => "private" };
  if (fixture === "foreign-element") state.foreignElement = { nodeType: 1 };
  if (fixture === "foreign-jquery") state.foreignJQuery = { text: () => "private" };
  if (fixture === "state-accessor" || fixture === "state-secret-accessor") {
    Object.defineProperty(state, "secret", {
      configurable: true,
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return { deep: "do-not-disclose" };
      },
    });
  }
  if (fixture === "state-proxy") {
    state.proxy = new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          proxyTrapCalls += 1;
          throw new Error("private proxy trap");
        },
      },
    );
  }
  const computed = { double: 4 };
  const calls: { target: string; arguments: readonly unknown[] }[] = [];
  const instance = {
    mode: "behavior",
    root,
    $root: $(root),
    state,
    computed,
  } as unknown as StarInstance;
  const context: StarContext = {
    $,
    state,
    computed,
    root,
    $root: $(root),
    element,
    $element: $(element),
    event:
      fixture === "event-function-shape"
        ? new CustomEvent("click", { cancelable: true, detail: { callback: () => "private" } })
        : new Event("click", { cancelable: true }),
    args: fixture === "array-arguments" ? ["a", "b"] : ["input", "second"],
    instance,
  };

  const action =
    (name: string, behavior: (current: StarContext) => unknown): StarAction =>
    (current) => {
      calls.push({ target: name, arguments: current.args ?? [] });
      return behavior(current);
    };
  const actions = new Map<string, StarAction>([
    ["save", action("save", () => Promise.resolve("saved"))],
    ["load", action("load", () => Promise.resolve(null))],
    ["never", action("never", () => null)],
    ["tick", action("tick", () => Promise.resolve(null))],
    ["value", action("value", () => ({ safe: true }))],
    ["functionValue", action("functionValue", () => () => null)],
    ["reject", action("reject", () => Promise.reject(new Error("private fixture rejection")))],
  ]);
  for (const [name, override] of Object.entries(actionOverrides)) actions.set(name, override);
  const helpers = new Map<string, unknown>([
    [
      "acme.math.sum",
      (left: number, right: number) => {
        calls.push({ target: "acme.math.sum", arguments: [left, right] });
        return left + right;
      },
    ],
    ["acme.tools.value", () => ({ safe: true })],
    ["acme.tools.functionValue", () => () => null],
    [
      "acme.tools.thenable",
      () => ({
        then: () => {
          thenCalls += 1;
        },
      }),
    ],
    ["acme.tools.jquery", () => $(label)],
  ]);
  const binding: StarExpressionRuntimeBinding = {
    resolveAction: (name) => actions.get(name),
    resolveHelper: (name) => {
      const value = helpers.get(name);
      return value === undefined ? undefined : Object.freeze({ name, value });
    },
    startAction: (_label, selected, current) => {
      const result = selected(current);
      return Object.freeze<ActionOperation>({
        id: "test-operation",
        result,
        active: () => operationActive,
        completed: () => {
          operationCompletions += 1;
        },
        failed: () => {
          operationFailures += 1;
        },
        settle: () => Promise.resolve(result),
      });
    },
  };
  const release = bindStarExpressionRuntime(instance, binding);
  return {
    calls,
    context,
    label,
    release,
    state,
    get accessorReads() {
      return accessorReads;
    },
    get operationCompletions() {
      return operationCompletions;
    },
    get operationFailures() {
      return operationFailures;
    },
    cancelOperation() {
      operationActive = false;
    },
    get proxyTrapCalls() {
      return proxyTrapCalls;
    },
    get thenCalls() {
      return thenCalls;
    },
  };
}

describe("CSP expression engine", () => {
  it("evaluates every accepted corpus program through closed capabilities", async () => {
    for (const item of await acceptedCases()) {
      const current = harness(item.fixture);
      const engine = createCSPExpressionEngine();
      try {
        const evaluator =
          item.entryKind === "value"
            ? engine.compileValue(item.source)
            : engine.compileStatement(item.source);
        if (item.expected.outcome === "compiled") continue;
        const immediate = evaluator(current.context);
        const result = immediate instanceof Promise ? await immediate : immediate;
        if (Object.hasOwn(item.expected, "value"))
          expect(result, item.id).toEqual(item.expected.value);
        if (item.expected.outcome === "undefined") expect(result, item.id).toBeUndefined();
        if (item.expected.state) expect(current.state, item.id).toMatchObject(item.expected.state);
        if (item.expected.calls) expect(current.calls, item.id).toEqual(item.expected.calls);
        if (item.id === "jquery-chain") expect(current.label.textContent).toBe("Saved");
      } finally {
        current.release();
        engine.dispose();
      }
    }
  });

  it("invalidates retained evaluators without retaining rejection causes", async () => {
    const current = harness("rejecting-action");
    const engine = createCSPExpressionEngine();
    const rejecting = engine.compileStatement("await action('reject')");
    let rejection: unknown;
    try {
      await rejecting(current.context);
    } catch (error) {
      rejection = error;
    }
    expect(isStarCSPExpressionError(rejection)).toBe(true);
    expect(rejection).toMatchObject({ code: "CSP_ASYNC_REJECTION", phase: "evaluate" });
    expect((rejection as Error).message).not.toContain("private fixture rejection");

    const retained = engine.compileValue("$count");
    engine.dispose();
    expect(() => retained(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_ENGINE_DISPOSED" }),
    );
    current.release();
  });

  it("prevents a late approved result from resuming effects after disposal", async () => {
    let resolveLoad!: (value: unknown) => void;
    const delayed = new Promise<unknown>((resolve) => {
      resolveLoad = resolve;
    });
    const current = harness(undefined, { load: () => delayed });
    const engine = createCSPExpressionEngine();
    const run = engine.compileStatement("await action('load'); $count = 99; return $count")(
      current.context,
    );

    engine.dispose();
    resolveLoad(null);

    await expect(run).rejects.toMatchObject({ code: "CSP_ENGINE_DISPOSED" });
    expect(current.state.count).toBe(2);
    current.release();
  });

  it("prevents a cancelled action result from resuming later statements", async () => {
    let resolveLoad!: (value: unknown) => void;
    const delayed = new Promise<unknown>((resolve) => {
      resolveLoad = resolve;
    });
    const current = harness(undefined, { load: () => delayed });
    const engine = createCSPExpressionEngine();
    const run = engine.compileStatement("await action('load'); $count = 99; return $count")(
      current.context,
    );

    current.cancelOperation();
    resolveLoad(null);

    await expect(run).rejects.toMatchObject({ code: "CSP_ASYNC_REJECTION" });
    expect(current.state.count).toBe(2);
    expect(current.operationCompletions).toBe(0);
    expect(current.operationFailures).toBe(1);
    current.release();
    engine.dispose();
  });

  it("adopts native promises without reading a public then and rejects accessor thenables", async () => {
    let nativeThenReads = 0;
    const native = Promise.resolve("safe");
    void Object.defineProperty(native, "then", {
      configurable: true,
      get: () => {
        nativeThenReads += 1;
        throw new Error("public then must not be read");
      },
    });
    const approved = harness(undefined, { save: () => native });
    const approvedEngine = createCSPExpressionEngine();
    await expect(approvedEngine.compileValue("action('save')")(approved.context)).resolves.toBe(
      "safe",
    );
    expect(nativeThenReads).toBe(0);
    approved.release();
    approvedEngine.dispose();

    let hostileThenReads = 0;
    const hostile = Object.defineProperty({}, "then", {
      get: () => {
        hostileThenReads += 1;
        return vi.fn();
      },
    });
    const denied = harness(undefined, { save: () => hostile });
    const deniedEngine = createCSPExpressionEngine();
    expect(() => deniedEngine.compileValue("action('save')")(denied.context)).toThrow(
      expect.objectContaining({ code: "CSP_ASYNC_VALUE" }),
    );
    expect(hostileThenReads).toBe(0);
    denied.release();
    deniedEngine.dispose();
  });

  it("rejects callback overloads, accessor writes, and callable raw results before invocation", () => {
    const current = harness();
    const engine = createCSPExpressionEngine();
    const callback = vi.fn(() => "private callback");
    const conversion = vi.fn(() => "private conversion");
    const setter = vi.fn();
    current.state.callback = callback;
    current.state.payload = { toString: conversion };
    Object.defineProperty(current.state, "guarded", {
      configurable: true,
      enumerable: true,
      set: setter,
    });

    expect(() => engine.compileValue("$(el).text(state.callback)")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );
    expect(() => engine.compileValue("$(el).text(state.payload)")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );
    expect(() => engine.compileValue("$(el).text('first','second')")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => engine.compileStatement("$guarded = 1")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }),
    );
    current.state.writeTrap = new Proxy(
      { value: 0 },
      {
        set: () => {
          throw new Error("private write trap");
        },
      },
    );
    expect(() => engine.compileStatement("state.writeTrap.value = 1")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }),
    );
    expect(() => engine.compileValue("action('functionValue')")(current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );

    expect(callback).not.toHaveBeenCalled();
    expect(conversion).not.toHaveBeenCalled();
    expect(setter).not.toHaveBeenCalled();
    expect(current.operationCompletions).toBe(0);
    expect(current.operationFailures).toBe(1);
    current.release();
    engine.dispose();
  });

  it("executes every reviewed primitive, data, DOM, event, and collection transition", () => {
    const current = harness();
    const engine = createCSPExpressionEngine();
    current.state.items = ["first", "second", null];
    const element = current.context.element as HTMLElement;
    element.dataset.role = "save";
    const event = new Event("click", { bubbles: true, cancelable: true });
    element.addEventListener("click", () => undefined);
    element.dispatchEvent(event);
    (current.context as unknown as { event: Event }).event = event;

    const cases: readonly [string, unknown][] = [
      ["action('value').safe", true],
      ["'abc'.length", 3],
      ["'ABC'.toLowerCase()", "abc"],
      ["'abcdef'.includes('cd',1)", true],
      ["'abcdef'.startsWith('ab',0)", true],
      ["'abcdef'.endsWith('ef')", true],
      ["'abcdef'.slice(1,3)", "bc"],
      ["'abcdef'.substring(1,3)", "bc"],
      ["'abcdef'.charAt()", "a"],
      ["args.at(-1)", "second"],
      ["args.at(99)", undefined],
      ["args.includes('second')", true],
      ["args.indexOf('second',1)", 1],
      ["args.slice(0,1).join('|')", "input"],
      ["[null,true,2].join('-')", "-true-2"],
      ["state.items.length", 3],
      ["state.items[1]", "second"],
      ["state.items[99]", undefined],
      ["evt.target.id", ""],
      ["evt.currentTarget", null],
      ["el.dataset.role", "save"],
      ["el.ownerDocument === root.ownerDocument", true],
      ["$el.length", 1],
      ["$el[0].value", "save"],
      ["$el[1]", undefined],
      ["1 < 2", true],
      ["1 <= 2", true],
      ["2 >= 1", true],
      ["'value:' + true + 2", "value:true2"],
    ];

    for (const [source, expected] of cases) {
      expect(engine.compileValue(source)(current.context), source).toEqual(expected);
    }

    expect(
      engine.compileStatement(
        "state['profile']['name'] = 'Grace'; state.profile.count = 1; state.profile.count += 2; return state.profile",
      )(current.context),
    ).toEqual({ name: "Grace", count: 3 });
    const sparse: unknown[] = [];
    sparse.length = 1;
    current.state.sparse = sparse;
    expect(engine.compileValue("state.sparse.at(0)")(current.context)).toBeUndefined();
    expect(engine.compileStatement("evt.stopPropagation(); return evt.type")(current.context)).toBe(
      "click",
    );

    current.release();
    engine.dispose();
  });

  it("fails closed across runtime-only capability and result boundaries", async () => {
    const evaluateFailure = (
      source: string,
      setup?: (current: ReturnType<typeof harness>) => void,
      actions: Readonly<Record<string, StarAction>> = {},
    ): unknown => {
      const current = harness(undefined, actions);
      const engine = createCSPExpressionEngine();
      setup?.(current);
      try {
        return engine.compileValue(source)(current.context);
      } finally {
        current.release();
        engine.dispose();
      }
    };

    expect(() => evaluateFailure("action('missing')")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("$ ")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );
    expect(() => evaluateFailure("action('nan')", undefined, { nan: () => Number.NaN })).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_NUMBER" }),
    );
    expect(() =>
      evaluateFailure("action('number').missing", undefined, { number: () => 1 }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_PROPERTY" }));
    expect(() => evaluateFailure("1.missing")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_PROPERTY" }),
    );
    expect(() => evaluateFailure("el.ownerDocument.title")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_PROPERTY" }),
    );
    expect(() => evaluateFailure("state.missing.value = 1")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_LVALUE" }),
    );
    expect(() => evaluateFailure("state.profile.missing += 1")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_NUMBER" }),
    );
    expect(() => evaluateFailure("state[state.profile]")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_PROPERTY" }),
    );
    expect(() => evaluateFailure("state.profile + 'x'")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() =>
      evaluateFailure("state.fn.missing", (current) => {
        current.state.fn = () => "private";
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_PROPERTY" }));
    expect(() =>
      evaluateFailure("state.nan + 1", (current) => {
        current.state.nan = Number.NaN;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_EVALUATE_NUMBER" }));
    expect(() =>
      evaluateFailure("$nan", (current) => {
        current.state.nan = Number.NaN;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_EVALUATE_NUMBER" }));
    expect(() =>
      evaluateFailure("$symbol", (current) => {
        current.state.symbol = Symbol("private");
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("state.live", (current) => {
        current.state.live = new Date();
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("computed.live", (current) => {
        (current.context.computed as Record<string, unknown>).live = Promise.resolve("private");
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("args", (current) => {
        (current.context as unknown as { args: object }).args = new Date();
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("evt.detail", (current) => {
        (current.context as unknown as { event: Event }).event = new CustomEvent("private", {
          detail: new Date(),
        });
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("state.revoked", (current) => {
        const { proxy, revoke } = Proxy.revocable({}, {});
        current.state.revoked = proxy;
        revoke();
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));
    expect(() =>
      evaluateFailure("state.invalidArray.length", (current) => {
        current.state.invalidArray = new Proxy([], {
          getOwnPropertyDescriptor: (target, key) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
            return key === "length" && descriptor ? { ...descriptor, value: -1 } : descriptor;
          },
        });
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() => {
      const { proxy, revoke } = Proxy.revocable({}, {});
      revoke();
      return evaluateFailure("action('revoked')", undefined, { revoked: () => proxy });
    }).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));
    expect(() =>
      evaluateFailure("action('revoking')", undefined, {
        revoking: () => {
          const pair = Proxy.revocable(
            { then: 1 },
            {
              getOwnPropertyDescriptor: (target, key) => {
                const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
                pair.revoke();
                return descriptor;
              },
            },
          );
          return pair.proxy;
        },
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));
    expect(() => evaluateFailure("'x'.includes(1)")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() => evaluateFailure("'x'.includes('x','bad')")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() => evaluateFailure("'x'.slice(0,1,2)")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("'x'.charAt(0,1)")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("args.at()")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("args.at('bad')")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() => evaluateFailure("args.includes()")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("args.join('-', ':')")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() => evaluateFailure("[{}].join() ")).toThrow(
      expect.objectContaining({ code: "CSP_EVALUATE_TYPE" }),
    );
    expect(() => evaluateFailure("args.slice(0,1,2)")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
    );
    expect(() => evaluateFailure("$(el).attr(state.name)")).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );
    expect(() =>
      evaluateFailure("$(el)", (current) => {
        (current.context as unknown as { element: object }).element = {};
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));

    expect(() =>
      evaluateFailure("computed.bad", (current) => {
        Object.defineProperty(current.context.computed, "bad", {
          configurable: true,
          get: () => {
            throw new Error("private computed failure");
          },
        });
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));
    expect(() =>
      evaluateFailure("$value", (current) => {
        const state = new Proxy(
          { value: 1 },
          {
            get: () => {
              throw new Error("private state failure");
            },
          },
        );
        (current.context as unknown as { state: Record<string, unknown> }).state = state;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));
    expect(() =>
      evaluateFailure("evt.type", (current) => {
        (current.context as unknown as { event: object }).event = new Proxy(
          {},
          {
            get: () => {
              throw new Error("private event failure");
            },
          },
        );
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }));

    expect(() =>
      evaluateFailure("state.large", (current) => {
        current.state.large = Array.from({ length: CSP_LIMITS.collectionSize + 1 });
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_LIMIT_COLLECTION_SIZE" }));

    const invalidJQuery = Object.assign(Object.create($.fn) as Record<string, unknown>, {
      0: {},
      length: 1,
    });
    expect(() =>
      evaluateFailure("$el[0]", (current) => {
        (current.context as unknown as { $element: unknown }).$element = invalidJQuery;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));

    const realmTrap = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error("private realm trap");
        },
      },
    );
    expect(() =>
      evaluateFailure("el.id", (current) => {
        (current.context as unknown as { element: object }).element = realmTrap;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));
    expect(() =>
      evaluateFailure("$el.length", (current) => {
        (current.context as unknown as { $element: object }).$element = realmTrap;
      }),
    ).toThrow(expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }));

    const throwGetOwn = new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          throw new Error("private descriptor trap");
        },
      },
    );
    expect(() => evaluateFailure("action('trap')", undefined, { trap: () => throwGetOwn })).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_ACCESSOR" }),
    );

    const asyncFailures: readonly [unknown, string][] = [
      [Number.NaN, "CSP_EVALUATE_NUMBER"],
      [document.createElement("div"), "CSP_CAPABILITY_VALUE"],
      [new Date(), "CSP_CAPABILITY_VALUE"],
      [
        new Proxy(
          {},
          {
            getPrototypeOf: () => {
              throw new Error("private prototype trap");
            },
          },
        ),
        "CSP_CAPABILITY_ACCESSOR",
      ],
    ];
    for (const [value, code] of asyncFailures) {
      const current = harness(undefined, { save: () => Promise.resolve(value) });
      const engine = createCSPExpressionEngine();
      await expect(engine.compileValue("action('save')")(current.context)).rejects.toMatchObject({
        code,
      });
      current.release();
      engine.dispose();
    }

    const originalText = $.fn.text;
    $.fn.text = function () {
      throw new Error("private jQuery failure");
    };
    try {
      expect(() => evaluateFailure("$(el).text('x')")).toThrow(
        expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
      );
    } finally {
      $.fn.text = originalText;
    }

    const current = harness();
    const span = Object.freeze({
      startOffset: 0,
      endOffset: 7,
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 8,
    });
    const forgedBinding = Object.freeze(
      Object.assign(Object.create(null) as Record<string, unknown>, {
        kind: "binding",
        name: "unknown",
        span,
      }),
    ) as unknown as CSPExpressionNode;
    expect(() => evaluateCSP(forgedBinding, "unknown", current.context)).toThrow(
      expect.objectContaining({ code: "CSP_CAPABILITY_VALUE" }),
    );

    const originalHas = Set.prototype.has;
    Set.prototype.has = function (value: unknown): boolean {
      if (
        value === "unlisted" &&
        ["trim", "at", "preventDefault"].some((marker) =>
          Reflect.apply(originalHas, this, [marker]),
        )
      ) {
        return true;
      }
      return Reflect.apply(originalHas, this, [value]) as boolean;
    };
    const unlisted = ["'x'.unlisted()", "[].unlisted()", "evt.unlisted()"];
    try {
      for (const source of unlisted) {
        const engine = createCSPExpressionEngine();
        expect(() => engine.compileValue(source)(current.context)).toThrow(
          expect.objectContaining({ code: "CSP_CAPABILITY_CALL" }),
        );
        engine.dispose();
      }
    } finally {
      Set.prototype.has = originalHas;
      current.release();
    }
  });

  it("matches every frozen evaluation diagnostic without invoking denied accessors or thenables", async () => {
    const rejected = [
      ...(await rejectedCases("denied")),
      ...(await rejectedCases("adversarial")),
    ].filter(({ diagnostic }) => diagnostic.phase === "evaluate");

    for (const item of rejected) {
      const current = harness(item.fixture);
      const engine = createCSPExpressionEngine();
      const evaluator =
        item.entryKind === "value"
          ? engine.compileValue(item.source)
          : engine.compileStatement(item.source);
      if (item.id === "disposed-evaluator") engine.dispose();
      let failure: unknown;
      try {
        const immediate = evaluator(current.context);
        if (immediate instanceof Promise) await immediate;
      } catch (error) {
        failure = error;
      }
      expect(isStarCSPExpressionError(failure), item.id).toBe(true);
      expect(failure, item.id).toMatchObject({
        code: item.diagnostic.code,
        phase: item.diagnostic.phase,
        span: item.diagnostic.span,
      });
      expect(current.accessorReads, item.id).toBe(0);
      expect(current.thenCalls, item.id).toBe(0);
      if (item.fixture === "state-proxy") expect(current.proxyTrapCalls, item.id).toBe(1);
      current.release();
      engine.dispose();
    }
  });

  it("keeps successful programs in a bounded LRU and never caches failures", () => {
    const engine = createCSPExpressionEngine();
    const first = engine.compileValue("0");
    expect(engine.compileValue("0")).toBe(first);
    expect(engine.compileValue("0", { attribute: "data-text" })).not.toBe(first);

    for (let index = 1; index <= CSP_CACHE_LIMITS.entries; index += 1) {
      engine.compileValue(String(index));
    }
    expect(engine.compileValue("0")).not.toBe(first);

    let firstFailure: unknown;
    let secondFailure: unknown;
    try {
      engine.compileValue("01");
    } catch (error) {
      firstFailure = error;
    }
    try {
      engine.compileValue("01");
    } catch (error) {
      secondFailure = error;
    }
    expect(firstFailure).not.toBe(secondFailure);

    const cached = engine.compileStatement("return 1");
    engine.clearCache();
    expect(engine.compileStatement("return 1")).not.toBe(cached);
    engine.dispose();
    expect(() => engine.compileValue("1")).toThrow(
      expect.objectContaining({ code: "CSP_ENGINE_DISPOSED" }),
    );
    expect(() => engine.clearCache()).toThrow(
      expect.objectContaining({ code: "CSP_ENGINE_DISPOSED" }),
    );
    engine.dispose();
  });

  it("maps every frozen implementation vocabulary entry exactly once", async () => {
    const input = await readFile(resolve("test/fixtures/csp/contract.json"), "utf8");
    const contract = JSON.parse(input) as {
      readonly tokenKinds: readonly string[];
      readonly productions: readonly string[];
      readonly nodeKinds: readonly string[];
      readonly diagnostics: readonly { readonly code: string; readonly phase: string }[];
      readonly limits: Record<string, number>;
      readonly methods: Record<string, readonly string[]>;
    };

    expect(CSP_TOKEN_KINDS).toEqual(contract.tokenKinds);
    expect(CSP_PRODUCTIONS).toEqual(contract.productions);
    expect(CSP_NODE_KINDS).toEqual(contract.nodeKinds);
    expect(Object.values(CSP_DIAGNOSTICS)).toEqual(
      contract.diagnostics.map(({ code, phase }) => ({ code, phase })),
    );
    expect(CSP_LIMITS).toEqual(contract.limits);
    expect(CSP_METHODS).toEqual(contract.methods);
  });

  it("contains no source-to-code or ambient module-loading path", async () => {
    const files = ["tokenizer.ts", "parser.ts", "evaluator.ts", "engine.ts"];
    const sources = await Promise.all(
      files.map((file) => readFile(resolve("src/csp", file), "utf8")),
    );
    const source = sources.join("\n");

    expect(source).not.toMatch(/\bnew\s+Function\b/);
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/\bimport\s*\(/);
    expect(source).not.toMatch(/\bWebAssembly\s*\./);
    expect(source).not.toMatch(/\bset(?:Timeout|Interval)\s*\(\s*["'`]/);
  });

  it("runs through the real kernel and declarative application lifecycle", async () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentDocument!;
    const root = owner.createElement("section");
    root.innerHTML = `
      <button data-on:click="$count++; @save($count)">Save</button>
      <output data-text="$count"></output>
    `;
    owner.body.append(root);
    const kernel = new Kernel($, owner, createCSPExpressionEngine());
    const save = vi.fn(() => Promise.resolve("saved"));
    kernel.registerAction("save", save);
    kernel.plugins.use({
      name: "acme.csptest",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.helper("acme.csptest.label", () => "helper-ready");
        return {};
      },
    });
    const helperOutput = owner.createElement("output");
    helperOutput.setAttribute("data-text", "acme.csptest.label()");
    root.append(helperOutput);
    const observations: string[] = [];
    kernel.observeOperations((observation) => {
      observations.push(`${observation.kind}:${observation.phase}`);
    });
    const application = new DeclarativeApplication($, root, kernel.applicationCapabilities, {
      count: 0,
    });
    kernel.trackApplication(application, application);

    $(root).find("button").trigger("click");
    await nextUpdate();
    await Promise.resolve();

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ args: [1], instance: application }),
    );
    expect(root.querySelector("output")?.textContent).toBe("1");
    expect(helperOutput.textContent).toBe("helper-ready");
    expect(observations).toEqual(["action:started", "action:completed"]);

    application.destroy();
    expect(kernel.applicationCount()).toBe(0);
    expect(kernel.dispose()).toMatchObject({ failed: [], remaining: [] });
    frame.remove();
  });
});

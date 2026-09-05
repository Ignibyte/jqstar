import type { ComputedRecord, StarContext, StateRecord } from "./types";
import type {
  StarExpressionEngine,
  StarExpressionError,
  StarExpressionLocation,
  StarStatementEvaluator,
  StarValueEvaluator,
} from "./expression-types";

export type {
  StarExpressionEngine,
  StarExpressionError,
  StarExpressionLocation,
  StarStatementEvaluator,
  StarValueEvaluator,
} from "./expression-types";

type ExpressionContext = StarContext<StateRecord, ComputedRecord>;

const ACTION_EXPRESSION = /^@([A-Za-z_$][\w$.-]*)(?:\(([\s\S]*)\))?$/;

class ExpressionFailure extends Error implements StarExpressionError {
  readonly location?: StarExpressionLocation;
  readonly phase: "compile" | "evaluate";
  readonly source: string;

  constructor(
    source: string,
    phase: "compile" | "evaluate",
    error: unknown,
    location?: StarExpressionLocation,
  ) {
    const detail = error instanceof Error ? error.message : String(error);
    const origin = location?.attribute ? ` at ${location.attribute}` : "";
    super(`Could not evaluate jQuery Star expression “${source}”${origin}: ${detail}`, {
      cause: error,
    });
    this.name = "StarExpressionError";
    this.source = source;
    this.phase = phase;
    if (location) this.location = location;
  }
}

function normalizedLocation(
  location: StarExpressionLocation | undefined,
): StarExpressionLocation | undefined {
  return location ? Object.freeze({ ...location }) : undefined;
}

function cacheKey(source: string, location: StarExpressionLocation | undefined): string {
  return JSON.stringify([
    source,
    location?.attribute ?? null,
    location?.line ?? null,
    location?.column ?? null,
  ]);
}

function scopeFor(context: ExpressionContext): object {
  const variables = Object.assign(
    Object.create(null) as Record<PropertyKey, unknown>,
    context.helpers ?? {},
    {
      $: context.$,
      el: context.element,
      evt: context.event,
      state: context.state,
      signals: context.state,
      computed: context.computed,
      root: context.root,
      $root: context.$root,
      $el: context.$element,
      args: context.args ?? [],
      stores: context.stores,
      action: (name: string, ...args: unknown[]) =>
        context.instance.run(name, { ...context, args }),
    },
  );

  return new Proxy(variables, {
    has(target, key) {
      if (key === Symbol.unscopables) return false;
      return key in target || (typeof key === "string" && key.startsWith("$") && key.length > 1);
    },

    get(target, key, receiver) {
      if (key === Symbol.unscopables) return undefined;
      if (Reflect.has(target, key)) return Reflect.get(target, key, receiver);
      if (typeof key === "string" && key.startsWith("$") && key.length > 1) {
        return context.state[key.slice(1)];
      }
      return undefined;
    },

    set(target, key, value, receiver) {
      if (Reflect.has(target, key)) return Reflect.set(target, key, value, receiver);
      if (typeof key === "string" && key.startsWith("$") && key.length > 1) {
        context.state[key.slice(1)] = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === "object" && value !== null) || typeof value === "function") &&
    "then" in value &&
    typeof value.then === "function"
  );
}

function expressionError(
  source: string,
  phase: "compile" | "evaluate",
  error: unknown,
  location?: StarExpressionLocation,
): StarExpressionError {
  return error instanceof ExpressionFailure
    ? error
    : new ExpressionFailure(source, phase, error, location);
}

function wrapResult(
  result: unknown,
  source: string,
  location: StarExpressionLocation | undefined,
): unknown {
  if (!isThenable(result)) return result;
  return Promise.resolve(result).catch((error: unknown) => {
    throw expressionError(source, "evaluate", error, location);
  });
}

export function createTrustedExpressionEngine(): StarExpressionEngine {
  const values = new Map<string, StarValueEvaluator>();
  const statements = new Map<string, StarStatementEvaluator>();
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) throw new Error("This jQStar expression engine has been disposed.");
  };

  const compileValue = (
    source: string,
    inputLocation?: StarExpressionLocation,
  ): StarValueEvaluator => {
    assertActive();
    const location = normalizedLocation(inputLocation);
    const key = cacheKey(source, location);
    const cached = values.get(key);
    if (cached) return cached;

    let evaluator: (scope: object) => unknown;
    try {
      evaluator = new Function("scope", `with (scope) { return (${source}); }`) as typeof evaluator;
    } catch (error) {
      throw expressionError(source, "compile", error, location);
    }

    const compiled = (context: ExpressionContext): unknown => {
      assertActive();
      try {
        return wrapResult(evaluator.call(context.element, scopeFor(context)), source, location);
      } catch (error) {
        throw expressionError(source, "evaluate", error, location);
      }
    };
    values.set(key, compiled);
    return compiled;
  };

  const compileStatement = (
    source: string,
    inputLocation?: StarExpressionLocation,
  ): StarStatementEvaluator => {
    assertActive();
    const trimmed = source.trim();
    const location = normalizedLocation(inputLocation);
    const key = cacheKey(trimmed, location);
    const cached = statements.get(key);
    if (cached) return cached;

    const action = ACTION_EXPRESSION.exec(trimmed);
    if (action) {
      const name = action[1]!;
      const args = action[2] === undefined ? undefined : compileValue(`[${action[2]}]`, location);
      const compiled = (context: ExpressionContext): unknown => {
        assertActive();
        try {
          const actionArgs = args?.(context);
          return wrapResult(
            context.instance.run(name, {
              ...context,
              args: Array.isArray(actionArgs) ? actionArgs : [],
            }),
            source,
            location,
          );
        } catch (error) {
          throw expressionError(source, "evaluate", error, location);
        }
      };
      statements.set(key, compiled);
      return compiled;
    }

    let evaluator: (scope: object, element: Element) => unknown;
    try {
      evaluator = new Function(
        "scope",
        "element",
        `with (scope) {
          return (async function () {
            ${source}
          }).call(element);
        }`,
      ) as (scope: object, element: Element) => unknown;
    } catch (error) {
      throw expressionError(source, "compile", error, location);
    }

    const compiled = (context: ExpressionContext): unknown => {
      assertActive();
      try {
        return wrapResult(evaluator(scopeFor(context), context.element!), source, location);
      } catch (error) {
        throw expressionError(source, "evaluate", error, location);
      }
    };
    statements.set(key, compiled);
    return compiled;
  };

  return {
    compileValue,
    compileStatement,
    clearCache() {
      assertActive();
      values.clear();
      statements.clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      values.clear();
      statements.clear();
    },
  };
}

const compatibilityEngine = createTrustedExpressionEngine();

export function compileValue(source: string): StarValueEvaluator {
  return compatibilityEngine.compileValue(source);
}

export function compileStatement(source: string): StarStatementEvaluator {
  return compatibilityEngine.compileStatement(source);
}

export function clearExpressionCache(): void {
  compatibilityEngine.clearCache();
}

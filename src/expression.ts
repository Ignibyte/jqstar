import type { ComputedRecord, StarContext, StateRecord } from "./types";

type Context = StarContext<StateRecord, ComputedRecord>;
type CompiledValue = (context: Context) => unknown;
type CompiledStatement = (context: Context) => unknown;

const values = new Map<string, CompiledValue>();
const statements = new Map<string, CompiledStatement>();

const ACTION_EXPRESSION = /^@([A-Za-z_$][\w$.-]*)(?:\(([\s\S]*)\))?$/;

function scopeFor(context: Context): object {
  const variables: Record<PropertyKey, unknown> = {
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
    action: (name: string, ...args: unknown[]) => context.instance.run(name, { ...context, args }),
  };

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

export function compileValue(source: string): CompiledValue {
  const cached = values.get(source);
  if (cached) return cached;

  let evaluator: (scope: object) => unknown;
  try {
    evaluator = new Function("scope", `with (scope) { return (${source}); }`) as (
      scope: object,
    ) => unknown;
  } catch (error) {
    throw expressionError(source, error);
  }

  const compiled = (context: Context): unknown => {
    try {
      return evaluator.call(context.element, scopeFor(context));
    } catch (error) {
      throw expressionError(source, error);
    }
  };
  values.set(source, compiled);
  return compiled;
}

export function compileStatement(source: string): CompiledStatement {
  const trimmed = source.trim();
  const cached = statements.get(trimmed);
  if (cached) return cached;

  const action = ACTION_EXPRESSION.exec(trimmed);
  if (action) {
    const name = action[1]!;
    const args = action[2] === undefined ? undefined : compileValue(`[${action[2]}]`);
    const compiled = (context: Context): unknown => {
      const actionArgs = args?.(context);
      return context.instance.run(name, {
        ...context,
        args: Array.isArray(actionArgs) ? actionArgs : [],
      });
    };
    statements.set(trimmed, compiled);
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
    throw expressionError(source, error);
  }

  const compiled = (context: Context): unknown => {
    try {
      return evaluator(scopeFor(context), context.element!);
    } catch (error) {
      throw expressionError(source, error);
    }
  };
  statements.set(trimmed, compiled);
  return compiled;
}

export function clearExpressionCache(): void {
  values.clear();
  statements.clear();
}

function expressionError(source: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Could not evaluate jQuery Star expression “${source}”: ${detail}`, {
    cause: error,
  });
}

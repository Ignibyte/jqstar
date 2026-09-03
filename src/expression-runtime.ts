import type { StarExpressionHelperRecord } from "./directive";
import type { ActionOperation } from "./observation";
import { jqstarRealmState } from "./realm-state";
import type { StarAction, StarContext, StarInstance } from "./types";

type StarExpressionCallKind = "action" | "helper";

export interface StarExpressionCallResult {
  readonly kind: StarExpressionCallKind;
  readonly name: string;
  readonly value: unknown;
  active(): boolean;
  completed(): void;
  failed(error: unknown): void;
}

export interface StarExpressionRuntime {
  invokeAction(
    name: string,
    args: readonly unknown[],
    context: StarContext,
  ): StarExpressionCallResult;
  invokeHelper(name: string, args: readonly unknown[]): StarExpressionCallResult;
}

export interface StarExpressionRuntimeBinding {
  resolveAction(name: string): StarAction | undefined;
  resolveHelper(name: string): StarExpressionHelperRecord | undefined;
  startAction(label: string, action: StarAction, context: StarContext): ActionOperation;
}

const applicationRuntimes = jqstarRealmState[0] as WeakMap<StarInstance, StarExpressionRuntime>;
const expressionCallResults = jqstarRealmState[1];

function callResult(
  kind: StarExpressionCallKind,
  name: string,
  value: unknown,
  active: () => boolean,
  completed: () => void,
  failed: (error: unknown) => void,
): StarExpressionCallResult {
  const result = Object.freeze({ kind, name, value, active, completed, failed });
  expressionCallResults.add(result);
  return result;
}

export function isStarExpressionCallResult(value: unknown): value is StarExpressionCallResult {
  return (
    ((typeof value === "object" && value !== null) || typeof value === "function") &&
    expressionCallResults.has(value as object)
  );
}

export function bindStarExpressionRuntime(
  application: StarInstance,
  binding: StarExpressionRuntimeBinding,
): () => void {
  if (applicationRuntimes.has(application)) {
    throw new Error("This jQStar application already has an expression runtime.");
  }

  const runtime = Object.freeze<StarExpressionRuntime>({
    invokeAction: (name, args, context) => {
      const action = binding.resolveAction(name);
      if (!action) throw new Error(`Unknown jQuery Star action: ${name}`);
      const operation = binding.startAction(name, action, {
        ...context,
        args,
        instance: application,
      });
      return callResult(
        "action",
        name,
        operation.result,
        () => operation.active(),
        () => operation.completed(),
        (error) => operation.failed(error),
      );
    },
    invokeHelper: (name, args) => {
      const helper = binding.resolveHelper(name);
      if (!helper || typeof helper.value !== "function") {
        throw new Error(`Unknown jQuery Star expression helper: ${name}`);
      }
      const invoke = helper.value as (...input: readonly unknown[]) => unknown;
      const value: unknown = invoke(...args);
      return callResult(
        "helper",
        helper.name,
        value,
        () => true,
        () => undefined,
        () => undefined,
      );
    },
  });
  applicationRuntimes.set(application, runtime);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (applicationRuntimes.get(application) === runtime) applicationRuntimes.delete(application);
  };
}

export function starExpressionRuntimeFor(
  context: Pick<StarContext, "instance">,
): StarExpressionRuntime | undefined {
  return applicationRuntimes.get(context.instance);
}

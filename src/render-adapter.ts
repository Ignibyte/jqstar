import { attempt, throwCollectedErrors } from "./errors";
import { runtimeInstallationFor } from "./runtime";
import type { StarJQueryMethod } from "./types";

export interface StarRenderBeginOptions {
  readonly preserveRoots?: Iterable<Element>;
}

export interface StarRenderTransaction {
  readonly operationId: number;
  preservedWithin(node: Element): readonly Element[];
  beforeRemove(node: Element): void;
  commit(incomingRoots?: Iterable<Element>): Promise<void>;
  fail(error: unknown): Promise<never>;
}

export interface StarRenderAdapter {
  begin(root: Element, options?: StarRenderBeginOptions): StarRenderTransaction;
}

export class StarRenderTransactionError extends Error {
  override readonly name = "StarRenderTransactionError";
}

export function createRenderAdapter($: JQueryStatic): StarRenderAdapter {
  const installation = runtimeInstallationFor($);
  if (!installation) {
    throw new Error("Install jQuery Star core before creating a render adapter.");
  }
  const { kernel } = installation;

  return Object.freeze({
    begin(root: Element, options: StarRenderBeginOptions = {}): StarRenderTransaction {
      const transaction = kernel.beginRender(root, {
        ...(options.preserveRoots ? { preserveRoots: options.preserveRoots } : {}),
        boot: (incomingRoot) => {
          const method = ($.fn as unknown as { star?: StarJQueryMethod }).star;
          if (!method) throw new Error("The jQuery Star application method is unavailable.");
          (method as (this: JQuery<Element>) => JQuery).call($(incomingRoot));
        },
      });
      let state: "active" | "settling" | "settled" = "active";

      const assertActive = (operation: string): void => {
        if (state !== "active") {
          throw new StarRenderTransactionError(
            `Render operation ${transaction.operationId} has already settled and cannot ${operation}.`,
          );
        }
        kernel.assertActive(operation);
      };

      const settle = async (operation: () => void): Promise<void> => {
        assertActive("settle again");
        state = "settling";
        const errors: unknown[] = [];
        attempt(errors, operation);
        try {
          await kernel.whenEnhanced();
        } catch (error) {
          errors.push(error);
        } finally {
          state = "settled";
        }
        throwCollectedErrors(
          errors,
          `jQuery Star render operation ${transaction.operationId} failed.`,
        );
      };

      return Object.freeze({
        operationId: transaction.operationId,
        preservedWithin(node: Element): readonly Element[] {
          assertActive("discover preserved roots");
          return transaction.preservedWithin(node);
        },
        beforeRemove(node: Element): void {
          assertActive("release outgoing ownership");
          transaction.beforeRemove(node);
        },
        commit(incomingRoots?: Iterable<Element>): Promise<void> {
          return settle(() => transaction.commit(incomingRoots));
        },
        fail(error: unknown): Promise<never> {
          return settle(() => transaction.fail(error)) as Promise<never>;
        },
      });
    },
  });
}

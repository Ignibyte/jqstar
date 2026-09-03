import { createTrustedExpressionEngine } from "./expression";
import type { StarExpressionEngine } from "./expression-types";
import { installStarRuntime } from "./runtime";
import type { StarInstalledJQuery } from "./types";

export interface StarCoreInstallOptions {
  readonly document?: Document;
  readonly expressionEngine?: StarExpressionEngine;
}

export function installStarCore(
  $: JQueryStatic,
  options: StarCoreInstallOptions = {},
): StarInstalledJQuery {
  return installStarRuntime($, {
    ...options,
    createExpressionEngine: createTrustedExpressionEngine,
  });
}

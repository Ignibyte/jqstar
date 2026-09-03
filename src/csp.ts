import { createCSPExpressionEngine, isCSPExpressionEngine } from "./csp/engine";
import { installStarRuntime, runtimeExpressionEngineFor } from "./runtime";
import type { StarInstalledJQuery } from "./types";

export {
  CSP_CONTRACT_DIGEST,
  CSP_DIAGNOSTICS,
  CSP_ENTRY_KINDS,
  CSP_GRAMMAR_VERSION,
  CSP_LIMITS,
  CSP_METHODS,
  CSP_NODE_KINDS,
  CSP_PRODUCTIONS,
  CSP_TOKEN_KINDS,
} from "./csp/contract";
export type {
  CSPDiagnostic,
  CSPDiagnosticCode,
  CSPDiagnosticPhase,
  CSPEntryKind,
  CSPNodeKind,
  CSPTokenKind,
} from "./csp/contract";
export { CSP_CACHE_LIMITS, createCSPExpressionEngine } from "./csp/engine";
export { isStarCSPExpressionError } from "./csp/diagnostics";
export type { CSPSourceSpan, StarCSPExpressionError } from "./csp/diagnostics";
export type {
  StarExpressionEngine,
  StarExpressionLocation,
  StarStatementEvaluator,
  StarValueEvaluator,
} from "./expression-types";

export interface StarCSPInstallOptions {
  readonly document?: Document;
}

export function installStarCSP(
  $: JQueryStatic,
  options: StarCSPInstallOptions = {},
): StarInstalledJQuery {
  const existing = runtimeExpressionEngineFor($);
  if (existing && !isCSPExpressionEngine(existing)) {
    throw new Error(
      "jQStar is already installed with a different expression engine. Install the CSP entry during initial installation.",
    );
  }
  return installStarRuntime($, {
    ...options,
    createExpressionEngine: createCSPExpressionEngine,
  });
}

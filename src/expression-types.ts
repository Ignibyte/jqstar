import type { StarContext } from "./types";

export interface StarExpressionLocation {
  readonly attribute?: string;
  readonly column?: number;
  readonly line?: number;
}

export interface StarExpressionError extends Error {
  readonly location?: StarExpressionLocation;
  readonly phase: "compile" | "evaluate";
  readonly source: string;
}

export type StarValueEvaluator = (context: StarContext) => unknown;
export type StarStatementEvaluator = (context: StarContext) => unknown;

export interface StarExpressionEngine {
  clearCache(): void;
  compileStatement(source: string, location?: StarExpressionLocation): StarStatementEvaluator;
  compileValue(source: string, location?: StarExpressionLocation): StarValueEvaluator;
  dispose(): void;
}

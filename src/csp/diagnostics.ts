import type { StarExpressionError, StarExpressionLocation } from "../expression-types";
import { CSP_GRAMMAR_VERSION, type CSPDiagnosticCode, type CSPDiagnosticPhase } from "./contract";

export interface CSPSourceSpan {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface StarCSPExpressionError extends StarExpressionError {
  readonly name: "StarCSPExpressionError";
  readonly code: CSPDiagnosticCode;
  readonly grammarVersion: typeof CSP_GRAMMAR_VERSION;
  readonly span: CSPSourceSpan;
}

function normalizedLocation(
  location: StarExpressionLocation | undefined,
): StarExpressionLocation | undefined {
  if (!location) return undefined;
  return Object.freeze({
    ...(location.attribute === undefined ? {} : { attribute: location.attribute }),
    ...(location.line === undefined ? {} : { line: location.line }),
    ...(location.column === undefined ? {} : { column: location.column }),
  });
}

function lineColumn(
  source: string,
  offset: number,
  location: StarExpressionLocation | undefined,
): { line: number; column: number } {
  let line = location?.line ?? 1;
  let column = location?.column ?? 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\r" && source[index + 1] === "\n") {
      index += 1;
      line += 1;
      column = 1;
    } else if (source[index] === "\r" || source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function cspSpan(
  source: string,
  startOffset: number,
  endOffset: number,
  location?: StarExpressionLocation,
): CSPSourceSpan {
  const start = lineColumn(source, startOffset, location);
  const end = lineColumn(source, endOffset, location);
  return Object.freeze({
    startOffset,
    endOffset,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  });
}

function excerpt(source: string, startOffset: number, endOffset: number): string {
  const center = Math.floor((startOffset + endOffset) / 2);
  const start = Math.max(0, center - 80);
  const end = Math.min(source.length, start + 160);
  return Array.from(source.slice(start, end), (character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127
      ? "�"
      : character;
  }).join("");
}

export function cspError(
  code: CSPDiagnosticCode,
  phase: CSPDiagnosticPhase,
  source: string,
  startOffset: number,
  endOffset: number,
  location?: StarExpressionLocation,
): StarCSPExpressionError {
  const safeLocation = normalizedLocation(location);
  const sample = excerpt(source, startOffset, endOffset);
  const origin = safeLocation?.attribute ? ` at ${safeLocation.attribute}` : "";
  const error = new Error(`${code}${origin}: jQStar CSP expression “${sample}”`) as Error & {
    code: CSPDiagnosticCode;
    grammarVersion: typeof CSP_GRAMMAR_VERSION;
    location?: StarExpressionLocation;
    phase: CSPDiagnosticPhase;
    source: string;
    span: CSPSourceSpan;
  };
  error.name = "StarCSPExpressionError";
  error.code = code;
  error.grammarVersion = CSP_GRAMMAR_VERSION;
  error.phase = phase;
  error.source = source;
  error.span = cspSpan(source, startOffset, endOffset, safeLocation);
  if (safeLocation) error.location = safeLocation;
  return error as StarCSPExpressionError;
}

export function isStarCSPExpressionError(error: unknown): error is StarCSPExpressionError {
  return error instanceof Error && error.name === "StarCSPExpressionError";
}

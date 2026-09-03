import type { StarExpressionLocation } from "../expression-types";
import { CSP_DIAGNOSTICS, CSP_LIMITS, type CSPTokenKind } from "./contract";
import { cspError, cspSpan, type CSPSourceSpan } from "./diagnostics";

export interface CSPToken {
  readonly kind: CSPTokenKind;
  readonly value: string | number | boolean | null;
  readonly span: CSPSourceSpan;
}

const keywords = new Set(["await", "false", "null", "return", "true"]);
const punctuators = new Set(["(", ")", "[", "]", "{", "}", ",", ".", ";", ":", "?", "@"]);
const operators = [
  "===",
  "!==",
  "??=",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "=>",
  "=",
  "!",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
] as const;
const actionNamePattern = /^[A-Za-z_$][A-Za-z0-9_$-]*(?:\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/;
const simpleEscapes: Readonly<Record<string, string>> = Object.freeze({
  "\\": "\\",
  "'": "'",
  '"': '"',
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
});

function isIdentifierStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_]/.test(character);
}

function isIdentifierPart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_]/.test(character);
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= "0" && character <= "9";
}

function isHex(character: string | undefined): boolean {
  return character !== undefined && /[0-9A-Fa-f]/.test(character);
}

function isWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\n" || character === "\r";
}

function readString(
  source: string,
  start: number,
  location: StarExpressionLocation | undefined,
): { readonly end: number; readonly value: string } {
  const quote = source[start]!;
  let value = "";
  let index = start + 1;

  const invalid = (startOffset: number, endOffset: number): never => {
    throw cspError(
      CSP_DIAGNOSTICS.invalidCharacter.code,
      CSP_DIAGNOSTICS.invalidCharacter.phase,
      source,
      startOffset,
      endOffset,
      location,
    );
  };

  while (index < source.length) {
    const current = source[index]!;
    if (current === quote) return Object.freeze({ end: index + 1, value });

    const code = source.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) invalid(index, index + 1);
    if (current !== "\\") {
      if (code >= 0xd800 && code <= 0xdbff) {
        const low = source.charCodeAt(index + 1);
        if (!(low >= 0xdc00 && low <= 0xdfff)) invalid(index, index + 1);
        value += current + source[index + 1]!;
        index += 2;
        continue;
      }
      if (code >= 0xdc00 && code <= 0xdfff) invalid(index, index + 1);
      value += current;
      index += 1;
      continue;
    }

    const escapeStart = index;
    const escaped = source[index + 1];
    if (escaped !== undefined && Object.hasOwn(simpleEscapes, escaped)) {
      value += simpleEscapes[escaped]!;
      index += 2;
      continue;
    }
    if (escaped !== "u" || ![0, 1, 2, 3].every((offset) => isHex(source[index + 2 + offset]))) {
      throw cspError(
        CSP_DIAGNOSTICS.invalidEscape.code,
        CSP_DIAGNOSTICS.invalidEscape.phase,
        source,
        escapeStart,
        Math.min(source.length, escapeStart + 2),
        location,
      );
    }

    const unit = Number.parseInt(source.slice(index + 2, index + 6), 16);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const second = index + 6;
      const validLow =
        source[second] === "\\" &&
        source[second + 1] === "u" &&
        [0, 1, 2, 3].every((offset) => isHex(source[second + 2 + offset]));
      const low = validLow ? Number.parseInt(source.slice(second + 2, second + 6), 16) : -1;
      if (low < 0xdc00 || low > 0xdfff) {
        throw cspError(
          CSP_DIAGNOSTICS.invalidEscape.code,
          CSP_DIAGNOSTICS.invalidEscape.phase,
          source,
          escapeStart,
          Math.min(source.length, escapeStart + 6),
          location,
        );
      }
      value += String.fromCharCode(unit, low);
      index += 12;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw cspError(
        CSP_DIAGNOSTICS.invalidEscape.code,
        CSP_DIAGNOSTICS.invalidEscape.phase,
        source,
        escapeStart,
        escapeStart + 6,
        location,
      );
    }
    value += String.fromCharCode(unit);
    index += 6;
  }

  throw cspError(
    CSP_DIAGNOSTICS.unterminatedString.code,
    CSP_DIAGNOSTICS.unterminatedString.phase,
    source,
    start,
    source.length,
    location,
  );
}

export function tokenizeCSP(
  input: unknown,
  location?: StarExpressionLocation,
): readonly CSPToken[] {
  if (typeof input !== "string") {
    throw cspError(
      CSP_DIAGNOSTICS.sourceType.code,
      CSP_DIAGNOSTICS.sourceType.phase,
      "",
      0,
      0,
      location,
    );
  }
  const source = input;
  if (source.length > CSP_LIMITS.sourceLength) {
    throw cspError(
      CSP_DIAGNOSTICS.sourceLength.code,
      CSP_DIAGNOSTICS.sourceLength.phase,
      source,
      CSP_LIMITS.sourceLength,
      CSP_LIMITS.sourceLength + 1,
      location,
    );
  }

  const tokens: CSPToken[] = [];
  let index = 0;

  const push = (
    kind: CSPTokenKind,
    value: CSPToken["value"],
    startOffset: number,
    endOffset: number,
  ): void => {
    if (tokens.length >= CSP_LIMITS.tokens - 1 && kind !== "eof") {
      throw cspError(
        CSP_DIAGNOSTICS.tokenLimit.code,
        CSP_DIAGNOSTICS.tokenLimit.phase,
        source,
        0,
        Math.min(1, source.length),
        location,
      );
    }
    tokens.push(
      Object.freeze({ kind, value, span: cspSpan(source, startOffset, endOffset, location) }),
    );
  };

  const invalid = (startOffset: number, endOffset: number): never => {
    throw cspError(
      CSP_DIAGNOSTICS.invalidCharacter.code,
      CSP_DIAGNOSTICS.invalidCharacter.phase,
      source,
      startOffset,
      endOffset,
      location,
    );
  };

  while (index < source.length) {
    const character = source[index]!;
    if (isWhitespace(character)) {
      index += 1;
      continue;
    }

    const start = index;
    if (
      character === "`" ||
      (character === "/" && (source[index + 1] === "/" || source[index + 1] === "*")) ||
      (character === "/" && tokens.length === 0 && source.indexOf("/", index + 1) >= 0)
    ) {
      throw cspError(
        CSP_DIAGNOSTICS.unsupportedSyntax.code,
        CSP_DIAGNOSTICS.unsupportedSyntax.phase,
        source,
        0,
        source.length,
        location,
      );
    }
    if (character === "'" || character === '"') {
      const result = readString(source, start, location);
      index = result.end;
      push("string", result.value, start, index);
      continue;
    }

    if (isDigit(character)) {
      index += 1;
      while (isDigit(source[index])) index += 1;
      if (source[start] === "0" && index - start > 1) {
        while (isIdentifierPart(source[index])) index += 1;
        throw cspError(
          CSP_DIAGNOSTICS.numberFormat.code,
          CSP_DIAGNOSTICS.numberFormat.phase,
          source,
          start,
          index,
          location,
        );
      }
      if (source[index] === "." && isDigit(source[index + 1])) {
        index += 2;
        while (isDigit(source[index])) index += 1;
      }
      if (source[index] === "e" || source[index] === "E") {
        index += 1;
        if (source[index] === "+" || source[index] === "-") index += 1;
        const exponentStart = index;
        while (isDigit(source[index])) index += 1;
        if (index === exponentStart) {
          throw cspError(
            CSP_DIAGNOSTICS.numberFormat.code,
            CSP_DIAGNOSTICS.numberFormat.phase,
            source,
            start,
            index,
            location,
          );
        }
      }
      if (isIdentifierStart(source[index]) || source[index] === "_") {
        while (isIdentifierPart(source[index])) index += 1;
        throw cspError(
          CSP_DIAGNOSTICS.numberFormat.code,
          CSP_DIAGNOSTICS.numberFormat.phase,
          source,
          start,
          index,
          location,
        );
      }
      const raw = source.slice(start, index);
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw cspError(
          CSP_DIAGNOSTICS.numberFormat.code,
          CSP_DIAGNOSTICS.numberFormat.phase,
          source,
          start,
          index,
          location,
        );
      }
      push("number", value, start, index);
      continue;
    }

    if (character === "$" && isIdentifierStart(source[index + 1])) {
      index += 2;
      while (isIdentifierPart(source[index])) index += 1;
      const name = source.slice(start + 1, index);
      if (name === "el" || name === "root") push("identifier", `$${name}`, start, index);
      else push("signal", name, start, index);
      continue;
    }

    if (isIdentifierStart(character)) {
      index += 1;
      while (isIdentifierPart(source[index])) index += 1;
      const value = source.slice(start, index);
      if (keywords.has(value)) {
        push(
          "keyword",
          value === "true" ? true : value === "false" ? false : value === "null" ? null : value,
          start,
          index,
        );
      } else {
        push("identifier", value, start, index);
      }
      continue;
    }

    if (character === "@") {
      push("punctuator", character, start, start + 1);
      index += 1;
      const nameStart = index;
      while (index < source.length && /[A-Za-z0-9_$.-]/.test(source[index]!)) {
        index += 1;
      }
      const name = source.slice(nameStart, index);
      if (name && actionNamePattern.test(name)) push("identifier", name, nameStart, index);
      continue;
    }

    if (character === "$") {
      push("identifier", character, start, start + 1);
      index += 1;
      continue;
    }

    const operator = operators.find((candidate) => source.startsWith(candidate, index));
    if (operator) {
      push("operator", operator, start, start + operator.length);
      index += operator.length;
      continue;
    }

    if (punctuators.has(character)) {
      push("punctuator", character, start, start + 1);
      index += 1;
      continue;
    }

    invalid(start, start + 1);
  }

  push("eof", "", source.length, source.length);
  return Object.freeze(tokens);
}

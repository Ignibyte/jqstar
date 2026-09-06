import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function closedObject(value, keys, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label}: object required`);
  assert(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label}: unexpected or missing fields`,
  );
}

export function boundedText(value, label, maximum = 2000) {
  assert(
    typeof value === "string" && value.trim().length > 0 && value.length <= maximum,
    `${label}: bounded non-empty text required`,
  );
}

export function safeRelativePath(value) {
  assert(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= 1024 &&
      !/[\\:]/u.test(value) &&
      ![...value].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) &&
      !value.split("/").some((part) => part === ".." || part === "." || part === ""),
    "Unsafe audit path",
  );
  return value;
}

export function sameKeys(actual, expected, label) {
  assert(
    Array.isArray(actual) &&
      Array.isArray(expected) &&
      new Set(actual).size === actual.length &&
      new Set(expected).size === expected.length &&
      JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()),
    `${label}: missing, duplicate, or unknown entries`,
  );
}

export function timestamp(value) {
  assert(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    "Invalid audit timestamp",
  );
  return Date.parse(value);
}

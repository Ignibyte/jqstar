export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === "object" && value !== null) || typeof value === "function") &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export function boundedText(value: string, maximum: number): string {
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127
      ? "�"
      : character;
  }).join("");
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

export function errorFields(
  error: unknown,
  fallback: string,
  describeThrown: (value: unknown) => string,
  keepEmptyMessage = true,
): { name: string; message: string } {
  let name = "ThrownValue";
  let message = fallback;
  try {
    if (error instanceof Error) {
      name = "Error";
      try {
        const value = error.name;
        if (typeof value === "string" && value) name = value;
      } catch {
        // Read each accessor once without replacing the original failure.
      }
      try {
        const value = error.message;
        if (typeof value === "string" && (keepEmptyMessage || value)) message = value;
      } catch {
        // A hostile message must not discard a readable name.
      }
    } else {
      message = describeThrown(error);
    }
  } catch {
    // Prototype traps and thrown-value conversion can fail too.
  }
  return { name, message };
}

export function diagnosticError(
  error: unknown,
  fallback: string,
  describeThrown: (kind: string) => string,
): Readonly<{ name: string; message: string }> {
  const { name, message } = errorFields(error, fallback, (value) => {
    const kind = value === null ? "null" : typeof value;
    return ["string", "number", "boolean", "bigint", "undefined"].includes(kind)
      ? String(value)
      : describeThrown(kind);
  });
  return Object.freeze({ name: boundedText(name, 120), message: boundedText(message, 1_024) });
}

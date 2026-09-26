import { attempt, cloneData, fail, identifier, safeKey } from "./data";
import type { StarPersistCodec, StarPersistData, StarPersistField } from "./types";

function fieldTarget(root: object, segments: readonly string[]): [Record<string, unknown>, string] {
  let target = root as Record<string, unknown>;
  for (const part of segments.slice(0, -1)) {
    if (!Object.hasOwn(target, part)) fail("decode");
    const next = target[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) fail("decode");
    target = next as Record<string, unknown>;
  }
  const key = segments.at(-1)!;
  if (!Object.hasOwn(target, key) || typeof target[key] === "function") fail("decode");
  return [target, key];
}

function shape(value: unknown): string {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}

export function createFieldCodec<Store extends object = Record<string, unknown>>(
  fields: readonly StarPersistField[],
  id = "fields",
): Readonly<StarPersistCodec<Store>> {
  identifier(id);
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > 128) fail("contract");
  const selected = fields.map(({ path, validate }: StarPersistField) => {
    if (typeof path !== "string" || path.length > 256 || typeof validate !== "function")
      fail("contract");
    const segments = path.split(".");
    if (!segments.every((part) => /^[A-Za-z][A-Za-z0-9_]*$/.test(part) && safeKey(part)))
      fail("contract");
    return { path, segments, validate };
  });
  const paths = selected.map(({ path }) => path).sort();
  if (
    paths.some(
      (path, index) =>
        index > 0 && (path === paths[index - 1] || path.startsWith(`${paths[index - 1]}.`)),
    )
  )
    fail("contract");
  const validated = (value: unknown, validate: StarPersistField["validate"]): StarPersistData => {
    const data = cloneData(value) as StarPersistData;
    const accepted: unknown = attempt("decode", () => validate(data));
    if (accepted !== true) fail("decode");
    return cloneData(data) as StarPersistData;
  };
  return Object.freeze({
    id,
    version: 1,
    encode(store: Readonly<Store>) {
      const data = Object.create(null) as Record<string, StarPersistData>;
      for (const { path, segments, validate } of selected) {
        const [target, key] = fieldTarget(store, segments);
        data[path] = validated(target[key], validate);
      }
      return data;
    },
    decode(data: StarPersistData, draft: Store) {
      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        Object.keys(data).sort().join("\n") !== paths.join("\n")
      )
        fail("decode");
      for (const { path, segments, validate } of selected) {
        const [target, key] = fieldTarget(draft, segments);
        if (shape(target[key]) !== shape(data[path])) fail("decode");
        target[key] = validated(data[path], validate);
      }
    },
  });
}

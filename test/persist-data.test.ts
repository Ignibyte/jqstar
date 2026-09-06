import { describe, expect, it, vi } from "vitest";
import {
  createFieldCodec,
  type StarPersistCodec,
  type StarPersistField,
  type StarPersistOptions,
} from "../src/persist";
import {
  byteLength,
  cloneData,
  parse,
  readonlySnapshot,
  serialize,
  storageKey,
  sync,
} from "../src/persist/data";
import { compareRevision, normalize, readEnvelope } from "../src/persist/envelope";

describe("canonical persistence data", () => {
  it("sorts records deterministically, preserves Unicode/null, and parses without prototypes", () => {
    const source = { z: [null, true, "🌟é"], a: { y: 2, x: 1 } };
    const canonical = serialize(source);
    expect(canonical).toBe('{"a":{"x":1,"y":2},"z":[null,true,"🌟é"]}');
    expect(serialize({ a: source.a, z: source.z })).toBe(canonical);
    const parsed = parse(canonical, 1000);
    expect(Object.getPrototypeOf(parsed)).toBeNull();
    expect(parsed).toEqual(source);
    expect(byteLength("🌟é")).toBe(6);
    expect(serialize(-0)).toBe("0");
    expect(() => serialize(source, byteLength(canonical) - 1)).toThrow("limit");
    expect(serialize(source, byteLength(canonical))).toBe(canonical);
    expect(() => parse(canonical, canonical.length - 1)).toThrow("limit");
    expect(() => parse('"🌟"', 5)).toThrow("limit");
  });

  it.each(
    [
      undefined,
      () => undefined,
      NaN,
      Infinity,
      1n,
      Symbol("x"),
      new Date(),
      new Map(),
      new Set(),
      { [Symbol("x")]: 1 },
      { constructor: 1 },
      { prototype: 1 },
      JSON.parse('{"__proto__":{}}') as unknown,
      Object.defineProperty({}, "hidden", { value: 1 }),
      new Array(2),
      Object.assign([], { other: 1 }),
    ].map((value) => ({ value })),
  )("rejects values outside the JSON preference contract (%#)", ({ value }) => {
    expect(() => serialize(value)).toThrow();
  });

  it.each(["__proto__", "prototype", "constructor"])(
    "rejects nested %s keys in both encoded preferences and stored JSON",
    (key) => {
      const record = { a: { "": Object.fromEntries([[key, 0]]) } };
      for (const value of [record, [record], { preferences: [record] }]) {
        expect(() => serialize(value)).toThrow("encode");
        expect(() => parse(JSON.stringify(value), 65536)).toThrow("corrupt");
      }
    },
  );

  it("never invokes accessors, then getters, or toJSON and bounds cyclic/deep/wide input", () => {
    const getter = vi.fn(() => 1);
    expect(() =>
      serialize(Object.defineProperty({}, "value", { get: getter, enumerable: true })),
    ).toThrow();
    expect(() => sync(Object.defineProperty({}, "then", { get: getter }))).toThrow("contract");
    expect(getter).not.toHaveBeenCalled();
    const toJSON = vi.fn(() => "hidden");
    expect(() => serialize({ toJSON })).toThrow();
    expect(toJSON).not.toHaveBeenCalled();
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(() => serialize(cycle)).toThrow("encode");
    let deep: object = {};
    for (let index = 0; index < 66; index++) deep = { deep };
    expect(() => serialize(deep)).toThrow("limit");
    expect(() => serialize(Array.from({ length: 10_001 }, () => ({})))).toThrow("limit");
    expect(() => serialize(Promise.resolve(1))).toThrow("contract");
    expect(() =>
      sync({
        then() {
          return undefined;
        },
      }),
    ).toThrow("contract");
    expect(sync(() => undefined)).toBeTypeOf("function");
    expect(() => parse("{", 1000)).toThrow("corrupt");
  });

  it("clones a read-only codec view without freezing the live store or serializing methods", () => {
    const method = (): void => undefined;
    const store = { nested: { count: 1 }, optional: undefined, method };
    const view = readonlySnapshot(store);
    expect(view.method).toBe(method);
    expect(view.optional).toBeUndefined();
    expect(Object.isFrozen(view.nested)).toBe(true);
    expect(Object.isFrozen(store.nested)).toBe(false);
    expect(() => {
      view.nested.count = 2;
    }).toThrow();
    expect(store.nested.count).toBe(1);
    expect(cloneData(null)).toBeNull();
  });

  it("derives stable bounded keys and rejects unsafe namespaces and explicit keys", () => {
    expect(storageKey("app.settings", "preferences")).toBe("jqstar:app.settings:preferences");
    expect(storageKey("app", "preferences", "explicit-key")).toBe("explicit-key");
    for (const namespace of [
      "",
      "__proto__",
      "constructor",
      "app.prototype",
      "a/b",
      " ",
      "é",
      "a".repeat(129),
    ]) {
      expect(() => storageKey(namespace, "preferences")).toThrow("contract");
    }
    expect(() => storageKey("app", "preferences", "bad/key")).toThrow();
  });
});

describe("field codecs and options", () => {
  const number = (value: unknown): boolean => typeof value === "number";

  it("selects declared nested paths and validates exact decoded fields against current kinds", () => {
    const codec = createFieldCodec<{ prefs: { count: number }; ignored: string }>([
      { path: "prefs.count", validate: number },
    ]);
    const source = { prefs: { count: 1 }, ignored: "private" };
    expect(codec.encode(source)).toEqual({ "prefs.count": 1 });
    codec.decode({ "prefs.count": 2 }, source);
    expect(source).toEqual({ prefs: { count: 2 }, ignored: "private" });
    for (const data of [
      null,
      [],
      1,
      {},
      { "prefs.count": "wrong" },
      { "prefs.count": 2, extra: 3 },
    ]) {
      expect(() => codec.decode(data, source)).toThrow("decode");
    }
  });

  it.each(
    [
      [],
      [{ path: "__proto__.x", validate: number }],
      [{ path: "prefs.constructor", validate: number }],
      [{ path: "prefs..count", validate: number }],
      [{ path: "x".repeat(257), validate: number }],
      [
        { path: "count", validate: number },
        { path: "count", validate: number },
      ],
      [
        { path: "prefs", validate: number },
        { path: "prefs.count", validate: number },
      ],
      [{ path: "a.0", validate: number }],
      [{ path: "count", validate: null }],
    ].map((fields) => ({ fields })),
  )("rejects invalid field declarations (%#)", ({ fields }) => {
    expect(() => createFieldCodec(fields as StarPersistField[])).toThrow("contract");
  });

  it("rejects unknown/method paths and synchronous validator contract violations", () => {
    for (const source of [
      {},
      { prefs: 2 },
      { prefs: [] },
      {
        prefs: {
          count() {
            return 1;
          },
        },
      },
    ]) {
      const codec = createFieldCodec([{ path: "prefs.count", validate: number }]);
      expect(() => codec.encode(source)).toThrow("decode");
    }
    for (const validate of [
      () => false,
      () => 1,
      () => {
        throw new Error("value secret");
      },
    ]) {
      const codec = createFieldCodec([{ path: "count", validate: validate as never }]);
      expect(() => codec.encode({ count: 1 })).toThrow("decode");
    }
    const asyncCodec = createFieldCodec([
      { path: "count", validate: (() => Promise.resolve(true)) as never },
    ]);
    expect(() => asyncCodec.encode({ count: 1 })).toThrow("contract");
    const codec = createFieldCodec([{ path: "count", validate: () => true }]);
    expect(() => codec.encode({ count: undefined })).toThrow("encode");
  });

  it("normalizes option defaults and rejects invalid schema, timing, codec, and migration contracts", () => {
    const codec = createFieldCodec([{ path: "count", validate: number }]);
    const options = { namespace: "test", version: 1, codec };
    expect(normalize(options)).toMatchObject({
      maxBytes: 65536,
      throttleMs: 100,
      maxDelayMs: 1000,
      strict: false,
      ttlMs: null,
    });
    for (const override of [
      { version: 0 },
      { version: 1.1 },
      { codec: null },
      { codec: { ...codec, version: -1 } },
      { codec: { ...codec, encode: null } },
      { codec: { ...codec, decode: null } },
      { throttleMs: -1 },
      { maxDelayMs: 0 },
      { throttleMs: 100, maxDelayMs: 50 },
      { maxBytes: 255 },
      { maxBytes: 1048577 },
      { clock: 1 },
      { ttlMs: 0 },
      { strict: 1 },
      { ownAdapter: "yes" },
      { flushOnDispose: null },
      { migrations: { 1: () => null } },
      { version: 3, migrations: { "01": () => null } },
      { version: 3, migrations: { 1: null } },
    ])
      expect(() => normalize({ ...options, ...override } as StarPersistOptions)).toThrow(
        "contract",
      );
  });
});

describe("envelope boundaries", () => {
  const codec: StarPersistCodec = {
    id: "fields",
    version: 1,
    encode: () => ({}),
    decode: () => undefined,
  };
  const options = normalize({ namespace: "test", version: 2, codec });
  const envelope = {
    format: "jquery-star-persist/1",
    namespace: "test",
    store: "prefs",
    version: 1,
    savedAt: 10,
    expiresAt: null,
    revision: { counter: 1, origin: "a" },
    codec: { id: "fields", version: 1 },
    data: {},
  };

  it("rejects malformed envelopes without allowing unknown metadata or unsafe revisions", () => {
    for (const override of [
      { extra: 1 },
      { format: "wrong" },
      { namespace: "elsewhere" },
      { store: "another" },
      { version: 0 },
      { version: 1.1 },
      { savedAt: -1 },
      { savedAt: null },
      { expiresAt: 9 },
      { expiresAt: "forever" },
      { revision: null },
      { revision: [] },
      { revision: { counter: 0, origin: "a" } },
      { revision: { counter: 1.1, origin: "a" } },
      { revision: { counter: 1, origin: "" } },
      { revision: { counter: 1, origin: "a".repeat(65) } },
      { codec: null },
    ])
      expect(() =>
        readEnvelope(JSON.stringify({ ...envelope, ...override }), "prefs", options),
      ).toThrow("corrupt");
    expect(() => readEnvelope("null", "prefs", options)).toThrow("corrupt");
    expect(() =>
      readEnvelope(JSON.stringify({ ...envelope, version: 3 }), "prefs", options),
    ).toThrow("future-version");
  });

  it("orders Lamport revisions without consulting wall-clock time", () => {
    const a = { counter: 1, origin: "a" };
    const b = { counter: 1, origin: "b" };
    expect(compareRevision(a, a)).toBe(0);
    expect(compareRevision(a, b)).toBe(-1);
    expect(compareRevision(b, a)).toBe(1);
    expect(compareRevision({ ...a, counter: 2 }, b)).toBe(1);
    expect(compareRevision(a, { ...b, counter: 2 })).toBe(-1);
  });
});

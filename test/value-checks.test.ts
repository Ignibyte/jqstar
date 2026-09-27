import { describe, expect, it, vi } from "vitest";
import {
  boundedText,
  cloneValue,
  diagnosticError,
  isPlainRecord,
  isThenable,
} from "../src/value-checks";

describe("shared core value boundaries", () => {
  it("isolates nested state copies while retaining atomic values and sparse array holes", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const method = () => 1;
    const custom = Object.create({ inherited: true }) as object;
    const sparse: unknown[] = [];
    sparse[2] = { value: 1 };
    const record = Object.assign(Object.create(null) as Record<string, unknown>, { count: 1 });
    const source = { nested: { count: 1 }, sparse, record, date, method, custom, empty: null };
    const copy = cloneValue(source);

    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(copy.nested).not.toBe(source.nested);
    expect(copy.sparse).not.toBe(sparse);
    expect(copy.sparse[2]).not.toBe(sparse[2]);
    expect(copy.sparse).toHaveLength(3);
    expect(0 in copy.sparse).toBe(false);
    expect(1 in copy.sparse).toBe(false);
    expect(copy.record).not.toBe(record);
    expect(Object.getPrototypeOf(copy.record)).toBe(Object.prototype);
    expect(copy.date).toBe(date);
    expect(copy.method).toBe(method);
    expect(copy.custom).toBe(custom);
    copy.nested.count = 2;
    copy.record.count = 3;
    expect(source.nested.count).toBe(1);
    expect(record.count).toBe(1);
  });

  it("copies enumerable string keys once and preserves a failing accessor's error", () => {
    const symbol = Symbol("state metadata");
    const read = vi.fn(() => ({ count: 1 }));
    const source = {
      get value() {
        return read();
      },
      [symbol]: "metadata",
    };
    Object.defineProperty(source, "hidden", { value: 2 });
    const copy = cloneValue(source);
    expect(copy).toEqual({ value: { count: 1 } });
    expect(Reflect.ownKeys(copy)).toEqual(["value"]);
    expect(read).toHaveBeenCalledOnce();
    const failure = new Error("state accessor");
    expect(() =>
      cloneValue({
        get value() {
          throw failure;
        },
      }),
    ).toThrow(failure);
  });

  it("accepts only current-realm plain or null-prototype records", () => {
    expect(isPlainRecord({})).toBe(true);
    expect(isPlainRecord(Object.create(null))).toBe(true);
    for (const value of [null, undefined, [], new Date(), new Map(), 1, "value", () => 1]) {
      expect(isPlainRecord(value)).toBe(false);
    }
    expect(isPlainRecord(Object.create({ inherited: true }))).toBe(false);
    const failure = new Error("prototype trap");
    expect(() =>
      isPlainRecord(
        new Proxy(
          {},
          {
            getPrototypeOf: () => {
              throw failure;
            },
          },
        ),
      ),
    ).toThrow(failure);
  });

  it("keeps thenable membership and accessor behavior for objects and functions", () => {
    for (const value of [Promise.resolve(), { then() {} }, Object.assign(() => 1, { then() {} })]) {
      expect(isThenable(value)).toBe(true);
    }
    for (const value of [null, undefined, 1, "then", {}, { then: 1 }]) {
      expect(isThenable(value)).toBe(false);
    }
    let reads = 0;
    const absent = new Proxy(
      {},
      {
        has: () => false,
        get: () => {
          reads += 1;
          return () => undefined;
        },
      },
    );
    expect(isThenable(absent)).toBe(false);
    expect(reads).toBe(0);
    const failure = new Error("then getter");
    expect(() =>
      isThenable({
        get then() {
          throw failure;
        },
      }),
    ).toThrow(failure);
  });

  it("preserves whitespace and Unicode while replacing controls before truncation", () => {
    expect(boundedText("a\t\n\rb", 20)).toBe("a\t\n\rb");
    const controls = String.fromCharCode(...Array.from({ length: 32 }, (_, index) => index), 127);
    expect(boundedText(controls, 40)).toBe("�".repeat(9) + "\t\n��\r" + "�".repeat(19));
    expect(boundedText("A🙂B", 4)).toBe("A🙂B");
    expect(boundedText("A🙂BC", 4)).toBe("A🙂…");
    expect(boundedText("abc", 3)).toBe("abc");
    expect(boundedText("abcd", 3)).toBe("ab…");
    expect(boundedText("", 1)).toBe("");
  });

  it("keeps diagnostic fallbacks and never coerces an arbitrary thrown object", () => {
    const describe = (kind: string) => `Failure: ${kind}`;
    const error = new Error("message");
    error.name = "NamedError";
    expect(diagnosticError(error, "fallback", describe)).toEqual({
      name: "NamedError",
      message: "message",
    });
    Object.defineProperties(error, {
      name: {
        get() {
          throw new Error("name getter");
        },
      },
      message: {
        get() {
          throw new Error("message getter");
        },
      },
    });
    expect(diagnosticError(error, "fallback", describe)).toEqual({
      name: "Error",
      message: "fallback",
    });
    const object = {
      toString() {
        throw new Error("coercion");
      },
    };
    expect(diagnosticError(object, "fallback", describe)).toEqual({
      name: "ThrownValue",
      message: "Failure: object",
    });
    expect(diagnosticError(null, "fallback", describe).message).toBe("Failure: null");
    expect(diagnosticError("text", "fallback", describe).message).toBe("text");
    expect(diagnosticError(12n, "fallback", describe).message).toBe("12");
    expect(diagnosticError(undefined, "fallback", describe).message).toBe("undefined");
    expect(diagnosticError(new Error(""), "fallback", describe).message).toBe("");
    expect(Object.isFrozen(diagnosticError(false, "fallback", describe))).toBe(true);
  });

  it("contains revoked proxies and reads changing error fields once", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(diagnosticError(proxy, "fallback", String)).toEqual({
      name: "ThrownValue",
      message: "fallback",
    });
    const error = new Error();
    const name = vi.fn().mockReturnValueOnce("NamedError").mockReturnValue(Object.create(null));
    const message = vi.fn().mockReturnValueOnce("message").mockReturnValue(Object.create(null));
    Object.defineProperties(error, { name: { get: name }, message: { get: message } });
    expect(diagnosticError(error, "fallback", String)).toEqual({
      name: "NamedError",
      message: "message",
    });
    expect(name).toHaveBeenCalledOnce();
    expect(message).toHaveBeenCalledOnce();
  });
});

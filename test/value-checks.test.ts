import { describe, expect, it, vi } from "vitest";
import { boundedText, diagnosticError, isPlainRecord, isThenable } from "../src/value-checks";

describe("shared core value boundaries", () => {
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

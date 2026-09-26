import { describe, expect, it, vi } from "vitest";
import { project } from "../src/inspect/redaction";
import { Trace, traceOptions, type MutableCounters } from "../src/inspect/trace";

const denied = "private-token-please-do-not-retain";
function observation(id = 1) {
  return {
    schema: "jquery-star-operation/1",
    id: `operation-${id}`,
    kind: "request",
    phase: "failed",
    owner: { id: "application-1", mode: "behavior" },
    request: {
      method: "POST",
      attempt: 1,
      status: 422,
      origin: `https://${denied}.test`,
      path: `/${denied}`,
    },
    error: { name: denied, message: denied, stack: denied, cause: new Error(denied) },
    headers: { authorization: denied },
    cookie: denied,
    body: denied,
    html: `<p>${denied}</p>`,
    state: { secret: denied },
    input: denied,
    url: `https://example.test/${denied}?${denied}#${denied}`,
    controller: new AbortController(),
    node: document.body,
    promise: Promise.resolve(denied),
  };
}
function counter(): MutableCounters {
  return {
    observed: 0,
    filtered: 0,
    sampled: 0,
    retained: 0,
    evicted: 0,
    oversized: 0,
    purged: 0,
    failures: {
      configuration: 0,
      capture: 0,
      serializer: 0,
      reentrant: 0,
      clock: 0,
      export: 0,
      cleanup: 0,
    },
  };
}

describe("inspection projection", () => {
  it("copies only scalar allowlisted fields and never invokes denied accessors or toJSON", () => {
    const input = observation();
    const getter = vi.fn(() => {
      throw new Error(denied);
    });
    Object.defineProperty(input, "error", { get: getter });
    Object.defineProperty(input, "toJSON", { value: getter });
    Object.defineProperty(input, Symbol("secret"), { value: denied });
    Object.defineProperty(input, "cycle", { value: input });
    const record = project(input, "request", 1, 0, () => undefined);
    expect(record).toEqual({
      sequence: 1,
      kind: "request",
      phase: "failed",
      outcome: "failed",
      elapsedMs: 0,
      id: "operation-1",
      ownerId: "application-1",
      method: "POST",
      attempt: 1,
      status: 422,
    });
    expect(JSON.stringify(record)).not.toContain(denied);
    expect(getter).not.toHaveBeenCalled();
    expect(Object.isFrozen(record)).toBe(true);
  });

  it("refuses hostile approved fields, prototypes, proxies and nonfinite metadata", () => {
    const withGetter = observation();
    const getter = vi.fn(() => {
      throw new Error(denied);
    });
    Object.defineProperty(withGetter, "id", { get: getter });
    for (const value of [
      withGetter,
      new Error(denied),
      document.body,
      Object.assign(Object.create({}), observation()),
      new Proxy({}, { getPrototypeOf: getter }),
      { ...observation(), request: { method: "POST", attempt: Infinity } },
      { ...observation(), id: `https://example.test/${denied}` },
      { ...observation(), owner: { id: denied, mode: "behavior" } },
    ]) {
      expect(() => project(value, "request", 1, 0, () => undefined)).toThrow();
    }
    // The proxy's explicit trap is contained; the approved-field getter itself is never invoked.
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("keeps fifty thousand sampled observations within exact byte and entry ceilings", () => {
    let sequence = 0;
    const counts = counter();
    const trace = new Trace(
      traceOptions({ maxEntries: 19, maxBytes: 2000, everyNth: 7 }),
      counts,
      { next: () => ++sequence },
      0,
      { sequence: 0, policyId: 0 },
    );
    for (let index = 1; index <= 50_000; index++) {
      trace.capture(observation(index), "request", index);
      if (index % 113 === 0) {
        const records = trace.records(index, false);
        expect(records.length).toBeLessThanOrEqual(19);
        expect(new TextEncoder().encode(JSON.stringify(records)).byteLength).toBe(
          trace.state(index).bytes,
        );
        expect(trace.state(index).bytes).toBeLessThanOrEqual(2000);
      }
    }
    expect(counts.observed).toBe(50_000);
    expect(counts.retained).toBe(Math.floor(50_000 / 7));
    expect(counts.sampled).toBe(50_000 - Math.floor(50_000 / 7));
    expect(JSON.stringify(trace.records(50_000, false))).not.toContain(denied);
    trace.dispose();
    expect(trace.state(50_000).bytes).toBe(2);
  });
});

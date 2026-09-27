import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { installStarCore } from "../src/core";
import { kernelForDocument } from "../src/kernel";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};

it.each(["method", "capture", "once", "passive", "signal", "native-add"] as const)(
  "staged cancellation during %s lookup stops delivery without failing installation",
  (phase) => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentWindow as Window & typeof globalThis;
    const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
    const target = owner.document.createElement("section");
    owner.document.body.append(target);
    const add = target.addEventListener;
    let cancel: () => void = () => undefined;
    let deliveries = 0;
    let entered = false;
    let nativeCalls = 0;
    const options: AddEventListenerOptions = {};
    try {
      if (phase === "method") {
        Object.defineProperty(target, "addEventListener", {
          configurable: true,
          get() {
            entered = true;
            cancel();
            return function (this: HTMLElement, ...args: Parameters<typeof add>) {
              nativeCalls++;
              add.apply(this, args);
            };
          },
        });
      } else if (phase === "native-add") {
        target.addEventListener = function (...args: Parameters<typeof add>) {
          entered = true;
          nativeCalls++;
          add.apply(this, args);
          cancel();
          target.dispatchEvent(new owner.Event("probe"));
        };
      } else {
        target.addEventListener = function (...args: Parameters<typeof add>) {
          nativeCalls++;
          return add.apply(this, args);
        };
        Object.defineProperty(options, phase, {
          get() {
            entered = true;
            cancel();
            return phase === "signal" ? undefined : false;
          },
        });
      }
      star.use({
        name: "probe.cancel-getter",
        version: "1.0.0",
        apiVersion: "^0.1.0",
        install(registrar) {
          cancel = registrar.documentHost.listen(target, "probe", () => deliveries++, options);
        },
      });
      expect(entered).toBe(true);
      expect(nativeCalls).toBe(phase === "native-add" ? 1 : 0);
      target.dispatchEvent(new owner.Event("probe"));
      expect(deliveries).toBe(0);
      expect(
        kernelForDocument(owner.document)
          ?.resourceSummary()
          .filter((item) => item.kind === "listener"),
      ).toHaveLength(0);
    } finally {
      Reflect.deleteProperty(target, "addEventListener");
      star.dispose();
      frame.remove();
    }
  },
);

it.each([false, true])(
  "staged cancellation preserves native cleanup failure with setup failure=%s",
  (setupThrows) => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentWindow as Window & typeof globalThis;
    const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
    const target = owner.document.createElement("section");
    owner.document.body.append(target);
    const add = target.addEventListener;
    const remove = target.removeEventListener;
    const setupFailure = new Error("native add failed");
    const cleanupFailure = new Error("native remove failed");
    let cancel: () => void = () => undefined;
    let deliveries = 0;
    let caught: unknown;
    try {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        add.apply(this, args);
        cancel();
        if (setupThrows) throw setupFailure;
      };
      target.removeEventListener = function (...args: Parameters<typeof remove>) {
        remove.apply(this, args);
        throw cleanupFailure;
      };
      try {
        star.use({
          name: "probe.cancel-errors",
          version: "1.0.0",
          apiVersion: "^0.1.0",
          install(registrar) {
            cancel = registrar.documentHost.listen(target, "probe", () => deliveries++);
          },
        });
      } catch (error) {
        caught = error;
      }
      if (setupThrows) {
        expect(caught).toBeInstanceOf(AggregateError);
        expect((caught as AggregateError).errors).toEqual([setupFailure, cleanupFailure]);
      } else {
        expect(caught).toBe(cleanupFailure);
      }
      target.dispatchEvent(new owner.Event("probe"));
      expect(deliveries).toBe(0);
      expect(
        kernelForDocument(owner.document)
          ?.resourceSummary()
          .filter((item) => item.kind === "listener"),
      ).toHaveLength(0);
    } finally {
      target.addEventListener = add;
      target.removeEventListener = remove;
      star.dispose();
      frame.remove();
    }
  },
);

it("keeps a newly staged replacement after cancelling native setup", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  let first: () => void = () => undefined;
  let second: () => void = () => undefined;
  let stageReplacement: () => void = () => undefined;
  let nativeCalls = 0;
  let deliveries = 0;
  const callback = () => deliveries++;
  try {
    target.addEventListener = function (...args: Parameters<typeof add>) {
      nativeCalls++;
      if (nativeCalls === 1) {
        first();
        stageReplacement();
      }
      return add.apply(this, args);
    };
    star.use({
      name: "probe.cancel-replaced",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        stageReplacement = () => {
          second = registrar.documentHost.listen(target, "probe", callback);
        };
        first = registrar.documentHost.listen(target, "probe", callback);
      },
    });
    expect(nativeCalls).toBe(2);
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
    first();
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(2);
    second();
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(2);
  } finally {
    target.addEventListener = add;
    star.dispose();
    frame.remove();
  }
});

it.each([undefined, null, {}])(
  "method getter cancellation stops before reading bind from %s",
  (method) => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentWindow as Window & typeof globalThis;
    const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
    const target = owner.document.createElement("section");
    owner.document.body.append(target);
    let cancel: () => void = () => undefined;
    let deliveries = 0;
    let getterCalls = 0;
    try {
      Object.defineProperty(target, "addEventListener", {
        configurable: true,
        get() {
          getterCalls++;
          cancel();
          return method;
        },
      });
      expect(() =>
        star.use({
          name: "probe.method-cancel",
          version: "1.0.0",
          apiVersion: "^0.1.0",
          install(registrar) {
            cancel = registrar.documentHost.listen(target, "probe", () => deliveries++);
          },
        }),
      ).not.toThrow();
      expect(getterCalls).toBe(1);
      target.dispatchEvent(new owner.Event("probe"));
      expect(deliveries).toBe(0);
      expect(
        kernelForDocument(owner.document)
          ?.resourceSummary()
          .filter((item) => item.kind === "listener"),
      ).toHaveLength(0);
    } finally {
      Reflect.deleteProperty(target, "addEventListener");
      star.dispose();
      frame.remove();
    }
  },
);

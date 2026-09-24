import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { installStarCore } from "../src/core";
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
it.each([false, true])(
  "cancelled staged listener rejects synchronous native delivery with throw=%s",
  (throws) => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentWindow as Window & typeof globalThis;
    const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
    const target = owner.document.createElement("section");
    owner.document.body.append(target);
    const add = target.addEventListener;
    let deliveries = 0,
      entered = false,
      registered = false;
    let cancel: () => void = () => undefined;
    try {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        entered = true;
        cancel();
        add.apply(this, args);
        registered = true;
        target.dispatchEvent(new owner.Event("probe"));
        if (throws) throw new Error("late staged setup");
      };
      const install = () =>
        star.use({
          name: "probe.cancel-listener",
          version: "1.0.0",
          apiVersion: "^0.1.0",
          install(r) {
            cancel = r.documentHost.listen(target, "probe", () => deliveries++);
          },
        });
      if (throws) expect(install).toThrow("late staged setup");
      else install();
      expect(entered).toBe(true);
      expect(registered).toBe(true);
      target.dispatchEvent(new owner.Event("probe"));
      expect(deliveries).toBe(0);
    } finally {
      target.addEventListener = add;
      star.dispose();
      frame.remove();
    }
  },
);
it("preserves ordinary staged listener delivery until cancellation", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  let deliveries = 0;
  let cancel: () => void = () => undefined;
  try {
    star.use({
      name: "probe.cancel-listener",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(r) {
        cancel = r.documentHost.listen(target, "probe", () => deliveries++);
      },
    });
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
    cancel();
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
  } finally {
    star.dispose();
    frame.remove();
  }
});

it("preserves native duplicate staged callbacks and either-handle cleanup", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  let deliveries = 0;
  const callback = () => deliveries++;
  let first: () => void = () => undefined;
  let second: () => void = () => undefined;
  try {
    star.use({
      name: "probe.cancel-listener",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(r) {
        first = r.documentHost.listen(target, "probe", callback);
        second = r.documentHost.listen(target, "probe", callback);
      },
    });
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
    first();
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
    second();
  } finally {
    star.dispose();
    frame.remove();
  }
});

it("cancelled duplicate acquisition preserves an earlier completed native owner", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  let acquisitions = 0,
    deliveries = 0;
  const callback = () => deliveries++;
  let first: () => void = () => undefined;
  let second: () => void = () => undefined;
  try {
    target.addEventListener = function (...args: Parameters<typeof add>) {
      acquisitions++;
      if (acquisitions === 2) second();
      add.apply(this, args);
    };
    star.use({
      name: "probe.cancel-listener",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(r) {
        first = r.documentHost.listen(target, "probe", callback);
        second = r.documentHost.listen(target, "probe", callback);
      },
    });
    expect(acquisitions).toBe(2);
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
    first();
    target.dispatchEvent(new owner.Event("probe"));
    expect(deliveries).toBe(1);
  } finally {
    target.addEventListener = add;
    star.dispose();
    frame.remove();
  }
});

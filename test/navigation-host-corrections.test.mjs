import { afterEach, describe, expect, it, vi } from "vitest";
import { installNavigationHostCorrections } from "./fixtures/navigation-decision/host-corrections.js";

const { document, window } = globalThis;
const cleanup = [];
const documentHost = {
  listen(target, name, handler) {
    target.addEventListener(name, handler);
    cleanup.push(() => target.removeEventListener(name, handler));
  },
};
afterEach(() => {
  for (const release of cleanup.splice(0)) release();
  document.body.innerHTML = "";
});

describe("navigation research host corrections", () => {
  it("preserves successful GET forms and only rejects non-redirect write success", () => {
    const recover = vi.fn();
    installNavigationHostCorrections(documentHost, "turbo", recover, () => {});
    for (const [method, redirected, prevented] of [
      ["get", false, false],
      ["post", true, false],
      ["post", false, true],
    ]) {
      const form = document.createElement("form");
      form.method = method;
      document.body.append(form);
      const event = new window.CustomEvent("turbo:before-fetch-response", {
        bubbles: true,
        cancelable: true,
        detail: { fetchResponse: { statusCode: 200, redirected } },
      });
      form.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(prevented);
      form.remove();
    }
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("handles only the exact transport error reported by Turbo and releases the handler", () => {
    const handled = vi.fn();
    installNavigationHostCorrections(documentHost, "turbo", () => {}, handled);
    const known = new TypeError("controlled transport error");
    const unrelated = new TypeError("controlled transport error");
    const reported = new window.CustomEvent("turbo:fetch-request-error", {
      cancelable: true,
      detail: { error: known },
    });
    document.dispatchEvent(reported);
    expect(reported.defaultPrevented).toBe(true);
    const rejection = (reason) => {
      const event = new window.Event("unhandledrejection", { cancelable: true });
      Object.defineProperty(event, "reason", { value: reason });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(rejection(unrelated)).toBe(false);
    expect(rejection(known)).toBe(true);
    expect(handled).toHaveBeenCalledTimes(1);
    for (const release of cleanup.splice(0)) release();
    expect(rejection(known)).toBe(false);
  });
});

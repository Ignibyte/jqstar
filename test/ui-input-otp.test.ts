import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#otp")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function slots(): HTMLElement[] {
  return Array.from(root().querySelectorAll<HTMLElement>('[data-part="slot"]'));
}

describe("jQuery Star Input OTP", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <label for="code">Verification code</label>
          <div id="otp" data-jqs="input-otp" data-length="6">
            <input id="code" data-part="control" type="text" name="code" required>
            <div data-part="slots"></div>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="external" data-on:click="@ui.input-otp.set('#otp', '654321')">Fill code</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps one native autocomplete control and renders visual slots", () => {
    expect(control().autocomplete).toBe("one-time-code");
    expect(control().inputMode).toBe("numeric");
    expect(control().maxLength).toBe(6);
    expect(slots()).toHaveLength(6);
    expect(root().querySelector('[data-part="slots"]')?.getAttribute("aria-hidden")).toBe("true");

    control().focus();
    expect(slots()[0]?.dataset.active).toBe("");
    control().value = "12a3";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(control().value).toBe("123");
    expect(slots().map((slot) => slot.textContent)).toEqual(["1", "2", "3", "", "", ""]);
    expect(slots()[3]?.dataset.active).toBe("");
  });

  it("completes through native input, API, and named actions", () => {
    const completed = vi.fn();
    root().addEventListener("jquery-star:input-otp:complete", completed);
    control().value = "123456";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect($.star.ui.inputOTP.value(root())).toBe("123456");
    expect($.star.ui.inputOTP.complete(root())).toBe(true);
    expect(root().dataset.state).toBe("complete");
    expect(completed).toHaveBeenCalledOnce();
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Code complete.");

    $.star.ui.inputOTP.clear(root());
    expect(control().value).toBe("");
    $("#external").trigger("click");
    expect(control().value).toBe("654321");
    expect(completed).toHaveBeenCalledTimes(2);
  });

  it("dispatches native events, supports cancellation, and serializes normally", () => {
    const input = vi.fn();
    const change = vi.fn();
    control().addEventListener("input", input);
    control().addEventListener("change", change);
    root().addEventListener("jquery-star:input-otp:before-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      if (detail.value === "999999") event.preventDefault();
    });

    $.star.ui.inputOTP.set(root(), "123456");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).get("code")).toBe(
      "123456",
    );

    $.star.ui.inputOTP.set(root(), "999999");
    expect(control().value).toBe("123456");
  });

  it("accepts server-patched values and configurable character patterns", () => {
    root().dataset.pattern = "[A-Z0-9]";
    root().dataset.value = "A1-b2C3";
    $.star.ui.enhance(root());
    expect(control().value).toBe("A12C3");
    expect($.star.ui.inputOTP.complete(root())).toBe(false);

    root().dataset.value = "ABC123";
    $.star.ui.enhance(root());
    expect(control().value).toBe("ABC123");
    expect(root().dataset.state).toBe("complete");
  });
});

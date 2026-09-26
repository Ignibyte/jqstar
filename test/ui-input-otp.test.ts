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

  it("keeps authored HTML slots when the container has unrelated children", () => {
    const container = root().querySelector<HTMLElement>('[data-part="slots"]');
    if (!container) throw new Error("Missing Input OTP slots part.");
    const authored = Array.from({ length: 6 }, (_, index) => {
      const slot = document.createElement("span");
      slot.dataset.part = "slot";
      slot.dataset.index = String(index);
      return slot;
    });
    const unrelated = document.createElement("div");
    unrelated.dataset.part = "other";
    const foreign = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    foreign.setAttribute("data-part", "slot");
    container.replaceChildren(unrelated, ...authored, foreign);

    $.star.ui.inputOTP.set(root(), "123456");

    expect(Array.from(container.children)).toEqual([unrelated, ...authored, foreign]);
    expect(authored.map((slot) => slot.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("rejects a control nested outside the direct part slot", () => {
    const input = control();
    const wrapper = document.createElement("div");
    input.replaceWith(wrapper);
    wrapper.append(input);
    try {
      expect(() => $.star.ui.enhance(root())).toThrow(
        'Input OTP #otp needs a direct <input data-part="control">.',
      );
    } finally {
      wrapper.replaceWith(input);
    }
  });

  it("rejects an unsupported native control type", () => {
    const input = control();
    input.type = "number";
    try {
      expect(() => $.star.ui.enhance(root())).toThrow(
        'Input OTP #otp control must use type="text", "password", or "tel".',
      );
    } finally {
      input.type = "text";
    }
  });

  it.each(["password", "tel"])("accepts a native %s control", (type) => {
    const input = control();
    input.type = type;
    try {
      $.star.ui.enhance(root());
      expect($.star.ui.inputOTP.value(root())).toBe("");
      expect(input.type).toBe(type);
    } finally {
      input.type = "text";
    }
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

  it("refreshes silent native edits on blur without a stale completion status", () => {
    const status = root().querySelector<HTMLElement>('[data-part="status"]');
    if (!status) throw new Error("Missing Input OTP status part.");
    $.star.ui.inputOTP.set(root(), "123456");
    expect(status.textContent).toBe("Code complete.");
    const changed = vi.fn();
    root().addEventListener("jquery-star:input-otp:change", changed);

    control().focus();
    expect(status.textContent).toBe("Code complete.");
    control().value = "123";
    control().blur();
    expect(status.textContent).toBe("");
    expect(root().dataset.state).toBe("incomplete");
    expect($.star.ui.inputOTP.value(root())).toBe("123");
    expect(changed).not.toHaveBeenCalled();
  });

  it("preserves authored status when refreshing an incomplete code", () => {
    const status = root().querySelector<HTMLElement>('[data-part="status"]');
    if (!status) throw new Error("Missing Input OTP status part.");
    status.textContent = "Enter remaining digits.";
    control().value = "12";
    control().focus();
    expect(status.textContent).toBe("Enter remaining digits.");
  });

  it("refreshes without an optional status part", () => {
    root().querySelector('[data-part="status"]')?.remove();
    expect(() => $.star.ui.enhance(root())).not.toThrow();
    control().value = "12";
    expect(() => control().focus()).not.toThrow();
    expect($.star.ui.inputOTP.value(root())).toBe("12");
  });

  it("uses an explicit native root in the set action and rejects a different component", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Input OTP application did not start.");
    await app.run("ui.input-otp.set", { args: [root(), "123456"] });
    expect(control().value).toBe("123456");
    const form = document.querySelector<HTMLFormElement>("#form");
    if (!form) throw new Error("Missing Input OTP form.");
    expect(new FormData(form).get("code")).toBe("123456");
    const foreign = document.getElementById("external");
    if (!foreign) throw new Error("Missing Input OTP external action.");
    await expect(
      app.run("ui.input-otp.set", { element: control(), args: [foreign, "999999"] }),
    ).rejects.toThrow('Input OTP target did not match data-jqs="input-otp"');
    expect(control().value).toBe("123456");
    await app.run("ui.input-otp.set", { element: control(), args: ["654321"] });
    expect(control().value).toBe("654321");
  });

  it("requires a code value in the set action and accepts a numeric code", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Input OTP application did not start.");
    for (const args of [[], [root()], [false]]) {
      await expect(app.run("ui.input-otp.set", { element: control(), args })).rejects.toThrow(
        "ui.input-otp.set needs a code value.",
      );
      expect(control().value).toBe("");
    }
    await app.run("ui.input-otp.set", { element: control(), args: [123456] });
    expect(control().value).toBe("123456");
  });

  it("stops a native edit when its before-change listener replaces the value", () => {
    const changes = vi.fn();
    root().addEventListener("jquery-star:input-otp:change", changes);
    root().addEventListener("jquery-star:input-otp:before-change", () => {
      control().value = "456";
    });
    control().value = "123";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(control().value).toBe("456");
    expect(changes).not.toHaveBeenCalled();
    expect(root().dataset.value).toBe("");
    $.star.ui.enhance(root());
    expect($.star.ui.inputOTP.value(root())).toBe("456");
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

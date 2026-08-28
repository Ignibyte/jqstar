import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function form(): HTMLFormElement {
  return document.querySelector<HTMLFormElement>("#profile-form")!;
}

function email(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>("#profile-email")!;
}

function message(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-part="message"]')!;
}

describe("jQuery Star Form", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.form.validate('#profile-form')">Validate</button>
        <form id="profile-form" data-jqs="form">
          <div data-jqs="field">
            <label data-part="label" for="profile-email">Email</label>
            <input id="profile-email" data-jqs="input" name="email" type="email" required aria-describedby="email-help">
            <p data-part="description" id="email-help">Account notices arrive here.</p>
            <p data-part="message" hidden></p>
          </div>
          <button type="reset">Reset</button>
          <button type="submit">Save</button>
        </form>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("maps native validity to the field, message, description, and first invalid focus", async () => {
    const invalid = vi.fn();
    form().addEventListener("jquery-star:form:invalid", invalid);

    expect($.star.ui.form.validate(form())).toBe(false);
    await Promise.resolve();

    expect(email().getAttribute("aria-invalid")).toBe("true");
    expect(email().closest('[data-jqs="field"]')?.getAttribute("data-invalid")).toBe("true");
    expect(message().hidden).toBe(false);
    expect(message().textContent).not.toBe("");
    expect(email().getAttribute("aria-describedby")?.split(" ")).toEqual([
      "email-help",
      message().id,
    ]);
    expect(document.activeElement).toBe(email());
    expect(invalid).toHaveBeenCalledOnce();
    expect(invalid.mock.calls[0]?.[0].detail.controls).toEqual([email()]);
  });

  it("clears only runtime-owned validation state when a marked control becomes valid", () => {
    $.star.ui.form.validate(form());
    email().value = "proof@example.com";
    email().dispatchEvent(new Event("input", { bubbles: true }));

    expect(email().hasAttribute("aria-invalid")).toBe(false);
    expect(email().getAttribute("aria-describedby")).toBe("email-help");
    expect(message().hidden).toBe(true);
    expect(message().textContent).toBe("");
    expect($.star.ui.form.valid(form())).toBe(true);
  });

  it("publishes submit lifecycle and lets applications cancel native submission", () => {
    email().value = "proof@example.com";
    const submitted = vi.fn();
    const prevent = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener("jquery-star:form:submit", submitted);
    form().addEventListener("jquery-star:form:before-submit", prevent);
    const event = new SubmitEvent("submit", {
      bubbles: true,
      cancelable: true,
      submitter: form().querySelector<HTMLButtonElement>('[type="submit"]'),
    });
    form().dispatchEvent(event);

    expect(prevent).toHaveBeenCalledOnce();
    expect(submitted).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("supports named validation and API reset without leaving stale errors", async () => {
    $("#external").trigger("click");
    await Promise.resolve();
    expect(email().getAttribute("aria-invalid")).toBe("true");

    const reset = vi.fn();
    form().addEventListener("jquery-star:form:reset", reset);
    email().value = "proof@example.com";
    $.star.ui.form.reset(form());
    await Promise.resolve();

    expect(email().value).toBe("");
    expect(email().hasAttribute("aria-invalid")).toBe(false);
    expect(message().hidden).toBe(true);
    expect(reset).toHaveBeenCalledOnce();
  });
});

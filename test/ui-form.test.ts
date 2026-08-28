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
        <button id="server-errors" data-on:click="@ui.form.set-errors('#profile-form', {email: 'Already registered.'})">Server error</button>
        <form id="profile-form" data-jqs="form">
          <div data-jqs="field">
            <label data-part="label" for="profile-email">Email</label>
            <input id="profile-email" data-jqs="input" name="email" type="email" required aria-describedby="email-help">
            <p data-part="description" id="email-help">Account notices arrive here.</p>
            <p data-part="message" hidden></p>
          </div>
          <button type="reset">Reset</button>
          <button type="submit">Save</button>
          <p data-part="server-message" hidden></p>
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

  it("maps backend field errors into native validity and clears them on edit", () => {
    email().value = "taken@example.com";
    const serverInvalid = vi.fn();
    form().addEventListener("jquery-star:form:server-invalid", serverInvalid);
    $.star.ui.form.setErrors(form(), {
      _form: "We could not save this profile.",
      email: ["Already registered.", "Use another address."],
    });

    expect(email().validity.customError).toBe(true);
    expect(email().validationMessage).toBe("Already registered. Use another address.");
    expect(email().getAttribute("aria-invalid")).toBe("true");
    expect(message().textContent).toBe("Already registered. Use another address.");
    expect(form().dataset.serverInvalid).toBe("true");
    expect(form().querySelector('[data-part="server-message"]')?.textContent).toBe(
      "We could not save this profile.",
    );
    expect(document.activeElement).toBe(email());
    expect(serverInvalid).toHaveBeenCalledOnce();

    email().value = "available@example.com";
    email().dispatchEvent(new Event("input", { bubbles: true }));
    expect(email().validity.customError).toBe(false);
    expect(email().hasAttribute("aria-invalid")).toBe(false);
    expect(message().hidden).toBe(true);

    $.star.ui.form.clearErrors(form());
    expect(form().hasAttribute("data-server-invalid")).toBe(false);
    const serverMessage = form().querySelector<HTMLElement>('[data-part="server-message"]')!;
    expect(serverMessage.hidden).toBe(true);
    expect(serverMessage.hasAttribute("role")).toBe(false);
    expect(serverMessage.hasAttribute("tabindex")).toBe(false);
  });

  it("supports backend error named actions and selective clearing", () => {
    email().value = "taken@example.com";
    $("#server-errors").trigger("click");
    expect(email().validationMessage).toBe("Already registered.");

    email().disabled = true;
    $.star.ui.form.clearErrors(form(), "email");
    expect(email().validity.customError).toBe(false);
    expect(email().hasAttribute("data-jqs-server-validation")).toBe(false);
    expect(message().hidden).toBe(true);
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

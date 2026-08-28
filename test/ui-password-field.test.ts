import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#password")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function toggle(): HTMLButtonElement {
  return root().querySelector<HTMLButtonElement>('[data-part="toggle"]')!;
}

describe("jQuery Star Password Field", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="password" data-jqs="password-field">
          <input data-part="control" type="password" name="password" autocomplete="current-password" value="secret">
          <button data-part="toggle"><span data-part="toggle-label"></span></button>
          <span data-part="status"></span>
        </div>
        <button id="external" data-on:click="@ui.password-field.show('#password')">Reveal</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("reveals and conceals without replacing or clearing the native password input", () => {
    const original = control();
    expect(toggle().getAttribute("aria-label")).toBe("Show password");
    expect(toggle().getAttribute("aria-pressed")).toBe("false");

    toggle().click();
    expect(control()).toBe(original);
    expect(control().type).toBe("text");
    expect(control().value).toBe("secret");
    expect(toggle().getAttribute("aria-label")).toBe("Hide password");
    expect($.star.ui.passwordField.visible(root())).toBe(true);

    $.star.ui.passwordField.hide(root());
    expect(control().type).toBe("password");
    $("#external").trigger("click");
    expect(control().type).toBe("text");
  });

  it("supports cancelable visibility changes and lifecycle detail", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:password-field:change", changed);
    root().addEventListener("jquery-star:password-field:before-change", (event) => {
      event.preventDefault();
    });
    toggle().click();
    expect(control().type).toBe("password");
    expect(changed).not.toHaveBeenCalled();
  });

  it("preserves autocomplete and native form serialization", () => {
    expect(control().autocomplete).toBe("current-password");
    const form = document.createElement("form");
    root().before(form);
    form.append(root());
    expect(new FormData(form).get("password")).toBe("secret");

    control().disabled = true;
    $.star.ui.enhance(root());
    expect(toggle().disabled).toBe(true);
  });
});

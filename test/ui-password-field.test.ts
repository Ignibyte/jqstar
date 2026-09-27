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

  it("rejects a wrong-kind element action target instead of revealing the nearby field", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Password Field application did not start.");
    const foreign = document.getElementById("external");
    if (!foreign) throw new Error("Missing Password Field external action.");
    await expect(
      app.run("ui.password-field.show", { element: control(), args: [foreign] }),
    ).rejects.toThrow('Password Field target did not match data-jqs="password-field"');
    expect(control().type).toBe("password");
    await app.run("ui.password-field.show", { args: [root()] });
    expect(control().type).toBe("text");
    await app.run("ui.password-field.hide", { element: control() });
    expect(control().type).toBe("password");
  });

  it("tracks a native type change on re-enhancement and toggles the same control", () => {
    const original = control();
    original.type = "text";
    $.star.ui.enhance(root());
    expect($.star.ui.passwordField.visible(root())).toBe(true);
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    $.star.ui.passwordField.toggle(root());
    expect(control()).toBe(original);
    expect(original.type).toBe("password");
    expect(original.value).toBe("secret");
  });

  it("does not announce an older visibility request after native attribute reentry", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:password-field:change", changed);
    const button = toggle();
    const setAttribute = button.setAttribute.bind(button);
    let reentered = false;
    vi.spyOn(button, "setAttribute").mockImplementation((name, value) => {
      setAttribute(name, value);
      if (name !== "aria-pressed" || value !== "true" || reentered) return;
      reentered = true;
      $.star.ui.passwordField.hide(root());
    });
    $.star.ui.passwordField.show(root());
    expect(reentered).toBe(true);
    expect(control().type).toBe("password");
    expect(root().dataset.state).toBe("hidden");
    expect(changed).toHaveBeenCalledOnce();
    expect((changed.mock.calls[0]?.[0] as CustomEvent<{ visible: boolean }>).detail.visible).toBe(
      false,
    );
  });

  it("keeps a reentrant replacement binding during old listener cleanup", () => {
    const previous = toggle();
    const replacement = previous.cloneNode(true) as HTMLButtonElement;
    previous.replaceWith(replacement);
    const remove = previous.removeEventListener.bind(previous);
    let reentered = false;
    vi.spyOn(previous, "removeEventListener").mockImplementation((type, listener, options) => {
      remove(type, listener, options);
      if (reentered) return;
      reentered = true;
      $.star.ui.passwordField.visible(root());
    });
    $.star.ui.enhance(root());
    expect(reentered).toBe(true);
    replacement.click();
    expect(control().type).toBe("text");
    previous.click();
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

  it.each(["control", "toggle", "status", "all"])(
    "binds current parts after replacing %s",
    async (part) => {
      const oldControl = control();
      const oldToggle = toggle();
      const oldStatus = root().querySelector('[data-part="status"]');
      if (!oldStatus) throw new Error("Missing status.");
      for (const element of [oldControl, oldToggle, oldStatus]) {
        if (part === "all" || element.getAttribute("data-part") === part)
          element.replaceWith(element.cloneNode(true));
      }
      $.star.ui.enhance(root());
      await $.star.whenEnhanced();
      const changed = vi.fn();
      root().addEventListener("jquery-star:password-field:change", changed);
      toggle().click();
      expect(control().type).toBe("text");
      expect(control().value).toBe("secret");
      expect(toggle().getAttribute("aria-controls")).toBe(control().id);
      expect(changed).toHaveBeenCalledOnce();
      if (!oldToggle.isConnected) {
        oldToggle.click();
        expect(changed).toHaveBeenCalledOnce();
      }
      const caps = new KeyboardEvent("keyup");
      vi.spyOn(caps, "getModifierState").mockReturnValue(true);
      control().dispatchEvent(caps);
      const status = root().querySelector('[data-part="status"]');
      expect(status?.textContent).toBe("Caps Lock is on.");
      if (!oldControl.isConnected) {
        const before = oldStatus.textContent;
        oldControl.dispatchEvent(caps);
        expect(oldStatus.textContent).toBe(before);
      }
      $.star.ui.passwordField.hide(root());
      expect(control().type).toBe("password");
    },
  );

  it("preserves live status and one listener set during unchanged enhancement", async () => {
    const caps = new KeyboardEvent("keyup");
    vi.spyOn(caps, "getModifierState").mockReturnValue(true);
    control().dispatchEvent(caps);
    $.star.ui.enhance(root());
    $.star.ui.enhance(root());
    await $.star.whenEnhanced();
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Caps Lock is on.");
    const changed = vi.fn();
    root().addEventListener("jquery-star:password-field:change", changed);
    toggle().click();
    expect(changed).toHaveBeenCalledOnce();
  });
});

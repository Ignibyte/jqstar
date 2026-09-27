import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUI } from "../src/ui/index";
import type { StarUIStatic } from "../src/types";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

let kernel: Kernel;
let ui: StarUIStatic;

beforeEach(() => {
  document.body.replaceChildren();
  kernel = new Kernel($, document);
  ui = createUI({ documentHost: kernel.documentHost, registerAction: kernel.registerAction });
});
afterEach(() => {
  kernel.dispose();
  document.body.replaceChildren();
});

function fixture(kind = "input"): {
  form: HTMLFormElement;
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  message: HTMLElement;
} {
  const markup =
    kind === "select"
      ? '<select><option value="">Choose</option><option>Ready</option></select>'
      : `<${kind}></${kind}>`;
  document.body.innerHTML = `<form id="associated" data-jqs="form"><button>Submit</button><fieldset></fieldset></form>
    <div data-jqs="field">${markup}<p data-part="message" hidden></p></div>`;
  const form = document.querySelector<HTMLFormElement>("form");
  const control = document.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(kind);
  const message = document.querySelector<HTMLElement>('[data-part="message"]');
  if (!form || !control || !message) throw new Error("Missing Form fixture parts.");
  control.setAttribute("form", form.id);
  control.name = "external";
  control.required = true;
  ui.enhance(document);
  return { form, control, message };
}

describe("Form native association", () => {
  it("restores native required errors after clearing a server error", () => {
    const { form, control, message } = fixture();
    ui.form.setErrors(form, { external: "Server rejection." });
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(control.validity.customError).toBe(false);
    expect(control.validity.valueMissing).toBe(true);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(message.textContent).toBe(control.validationMessage);
  });

  it("ignores non-control events and descendants associated with another form", () => {
    const { form, control } = fixture();
    const other = document.createElement("form");
    other.id = "another-owner";
    document.body.append(other);
    form.append(control);
    control.setAttribute("form", other.id);
    form.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("invalid"));
    expect(control.form).toBe(other);
    expect(control.hasAttribute("aria-invalid")).toBe(false);
  });
  it.each(["input", "select", "textarea"])(
    "includes external %s validity, focus and Field messages",
    async (kind) => {
      const { form, control, message } = fixture(kind);
      const invalid = vi.fn();
      form.addEventListener("jquery-star:form:invalid", invalid);
      expect(control.form).toBe(form);
      expect(ui.form.valid(form)).toBe(false);
      expect(ui.form.validate(form)).toBe(false);
      await Promise.resolve();
      expect(control.getAttribute("aria-invalid")).toBe("true");
      expect(message.hidden).toBe(false);
      expect(message.textContent).toBe(control.validationMessage);
      expect(control.getAttribute("aria-describedby")).toBe(message.id);
      expect(document.activeElement).toBe(control);
      expect(invalid).toHaveBeenCalledOnce();
      expect(invalid.mock.calls[0]?.[0].detail.controls).toEqual([control]);
      control.value = "Ready";
      control.dispatchEvent(new Event("input", { bubbles: true }));
      expect(ui.form.valid(form)).toBe(true);
      expect(control.hasAttribute("aria-invalid")).toBe(false);
      expect(message.hidden).toBe(true);
    },
  );

  it.each(["input", "change"])("clears external server errors on native %s", (event) => {
    const { form, control, message } = fixture();
    control.value = "Ready";
    ui.form.setErrors(form, { external: "Already used." });
    expect(control.validity.customError).toBe(true);
    expect(message.textContent).toBe("Already used.");
    control.dispatchEvent(new Event(event, { bubbles: true }));
    expect(control.validity.customError).toBe(false);
    expect(message.hidden).toBe(true);
  });

  it("clears disabled external errors and resets native values and Field state", async () => {
    const { form, control, message } = fixture();
    control.value = "Ready";
    ui.form.setErrors(form, { external: "Rejected." });
    expect(control.validity.customError).toBe(true);
    control.disabled = true;
    ui.form.clearErrors(form, "external");
    expect(control.validity.customError).toBe(false);
    expect(message.hidden).toBe(true);
    control.disabled = false;
    ui.form.setErrors(form, { external: "Rejected again." });
    ui.form.reset(form);
    await Promise.resolve();
    expect(control.value).toBe("");
    expect(control.validity.customError).toBe(false);
    expect(control.hasAttribute("aria-invalid")).toBe(false);
    expect(message.hidden).toBe(true);
  });

  it("follows current association and ignores unrelated controls without duplicate invalid events", async () => {
    const { form, control } = fixture();
    const other = document.createElement("form");
    other.id = "other-form";
    other.dataset.jqs = "form";
    document.body.append(other);
    ui.enhance(document);
    ui.enhance(document);
    const first = vi.fn();
    const second = vi.fn();
    form.addEventListener("jquery-star:form:invalid", first);
    other.addEventListener("jquery-star:form:invalid", second);
    control.setAttribute("form", other.id);
    expect(ui.form.valid(form)).toBe(true);
    expect(ui.form.valid(other)).toBe(false);
    control.checkValidity();
    await Promise.resolve();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    control.removeAttribute("form");
    control.removeAttribute("aria-invalid");
    control.checkValidity();
    await Promise.resolve();
    expect(control.hasAttribute("aria-invalid")).toBe(false);
    expect(second).toHaveBeenCalledOnce();
  });

  it("handles contained controls once and retains detached local form validation", async () => {
    const { form, control, message } = fixture();
    const field = control.closest('[data-jqs="field"]');
    if (!field) throw new Error("Missing fixture Field.");
    form.append(field);
    control.removeAttribute("form");
    const invalid = vi.fn();
    form.addEventListener("jquery-star:form:invalid", invalid);
    ui.form.validate(form);
    await Promise.resolve();
    expect(invalid).toHaveBeenCalledOnce();
    form.remove();
    control.value = "Ready";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(message.hidden).toBe(true);
    control.value = "";
    ui.form.validate(form, { focus: false });
    await Promise.resolve();
    // Native removal retires the old controller and its queued announcement.
    expect(invalid).toHaveBeenCalledOnce();
    expect(message.hidden).toBe(false);
    ui.form.validate(form, { focus: false });
    await Promise.resolve();
    expect(invalid).toHaveBeenCalledTimes(2);
    expect(message.hidden).toBe(false);
  });

  it("releases external event handling when the document host is disposed", () => {
    const { form, control, message } = fixture();
    control.value = "Ready";
    ui.form.setErrors(form, { external: "Rejected." });
    expect(control.validity.customError).toBe(true);
    kernel.dispose();
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(control.validity.customError).toBe(true);
    expect(message.textContent).toBe("Rejected.");
    expect(kernel.resourceSummary()).toEqual([]);
  });
});

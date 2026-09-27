import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing Form fixture part");
  return value;
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow);
}
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { owner, jquery, star, ui: star.use(uiPlugin) };
}
function fixture(owner: Window = window) {
  const form = owner.document.createElement("form");
  form.id = "form-probe";
  form.className = "form-target";
  form.dataset.jqs = "form";
  form.innerHTML =
    '<div data-jqs="field"><input name="first" required aria-describedby="authored"><p data-part="message" hidden></p></div><div data-jqs="field"><input name="second"><p data-part="message" hidden></p></div><button type="submit">Save</button><p data-part="server-message" hidden></p>';
  const first = required(form.querySelector<HTMLInputElement>('[name="first"]'));
  const second = required(form.querySelector<HTMLInputElement>('[name="second"]'));
  const message = required(form.querySelector<HTMLElement>('[data-part="message"]'));
  return { form, first, second, message };
}
function native(owner: Window, type: string): Event {
  return new (owner as Window & typeof globalThis).Event(type, {
    bubbles: type !== "invalid",
    cancelable: true,
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

describe.each(["local", "foreign"])("Form %s document", (scope) => {
  function setup() {
    const installed = install(scope === "local" ? window : realm());
    return { ...installed, ...fixture(installed.owner) };
  }

  it("uses native validity and events from the owning window", async () => {
    const { ui, owner, form, first, message } = setup();
    const events: Event[] = [];
    form.addEventListener("jquery-star:form:invalid", (event) => events.push(event));
    expect(ui.form.valid(form)).toBe(false);
    expect(ui.form.validate(form, { focus: false })).toBe(false);
    await Promise.resolve();
    expect(message.textContent).toBe(first.validationMessage);
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
    first.value = "Ready";
    first.dispatchEvent(native(owner, "input"));
    expect(ui.form.valid(form)).toBe(true);
    expect(first.getAttribute("aria-describedby")).toBe("authored");
  });

  it.each(["implicit", "id", "class", "element"])(
    "resolves %s actions on the application root",
    async (mode) => {
      const { jquery, form, first } = setup();
      const app = required(jquery(form).star().star("instance"));
      const target = mode === "id" ? "#form-probe" : mode === "class" ? ".form-target" : form;
      await app.run("ui.form.set-errors", {
        args: mode === "implicit" ? [{ first: "Rejected" }] : [target, { first: "Rejected" }],
      });
      expect(first.validationMessage).toBe("Rejected");
      await app.run("ui.form.clear-errors", {
        args: mode === "implicit" ? ["first"] : [target, ["first"]],
      });
      expect(first.validity.customError).toBe(false);
    },
  );

  it.each([true, false])("honors canceled native reset registered first=%s", async (before) => {
    const { ui, form, first } = setup();
    const cancel = (event: Event): void => event.preventDefault();
    if (before) form.addEventListener("reset", cancel);
    ui.form.setErrors(form, { first: "Rejected" }, { focus: false });
    if (!before) form.addEventListener("reset", cancel);
    ui.form.reset(form);
    await Promise.resolve();
    expect(first.validationMessage).toBe("Rejected");
  });

  it("retains a current reset through unchanged enhancement", async () => {
    const { ui, form, first } = setup();
    ui.form.setErrors(form, { first: "Rejected" }, { focus: false });
    const reset = vi.fn();
    form.addEventListener("jquery-star:form:reset", reset);
    ui.form.reset(form);
    ui.enhance(form);
    await Promise.resolve();
    expect(first.validity.customError).toBe(false);
    expect(reset).toHaveBeenCalledOnce();
  });

  it("keeps a newer error instead of queued reset cleanup", async () => {
    const { ui, form, first } = setup();
    ui.enhance(form);
    ui.form.reset(form);
    ui.form.setErrors(form, { first: "Current rejection" }, { focus: false });
    await Promise.resolve();
    expect(first.validationMessage).toBe("Current rejection");
  });

  it("does not notify an already canceled native submission", () => {
    const { ui, owner, form } = setup();
    form.addEventListener("submit", (event) => event.preventDefault());
    ui.enhance(form);
    const submitted = vi.fn();
    form.addEventListener("jquery-star:form:submit", submitted);
    form.dispatchEvent(native(owner, "submit"));
    expect(submitted).not.toHaveBeenCalled();
  });

  it.each(["inert", "data-disabled", "aria-disabled"])(
    "stops native and named operations under %s while API calls remain available",
    async (constraint) => {
      const { ui, jquery, owner, form, first } = setup();
      const app = required(jquery(form).star().star("instance"));
      form.setAttribute(constraint, "true");
      const submitted = vi.fn();
      form.addEventListener("jquery-star:form:submit", submitted);
      form.dispatchEvent(native(owner, "submit"));
      await app.run("ui.form.set-errors", { args: [{ first: "Ignored" }] });
      expect(first.validity.customError).toBe(false);
      expect(submitted).not.toHaveBeenCalled();
      ui.form.setErrors(form, { first: "Programmatic" }, { focus: false });
      expect(first.validationMessage).toBe("Programmatic");
    },
  );

  it("releases provisional listeners after later registration fails", () => {
    const { ui, form, first, owner } = setup();
    const add = form.addEventListener.bind(form);
    const remove = vi.spyOn(form, "removeEventListener");
    const spy = vi.spyOn(form, "addEventListener").mockImplementation((name, ...args) => {
      if (name === "change") throw new Error("registration failed");
      add(name, ...args);
    });
    expect(() => ui.enhance(form)).toThrow("registration failed");
    expect(remove).toHaveBeenCalledWith("invalid", expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith("input", expect.any(Function));
    spy.mockRestore();
    ui.enhance(form);
    first.dispatchEvent(native(owner, "invalid"));
    expect(first.getAttribute("aria-invalid")).toBe("true");
  });

  it.each(["dispose", "newer", "replace", "reassociate", "value"])(
    "stops server-error writes after a native setter triggers %s",
    (mode) => {
      const { ui, star, form, first, second, owner } = setup();
      ui.enhance(form);
      const changed = vi.fn();
      form.addEventListener("jquery-star:form:server-invalid", changed);
      const set = first.setCustomValidity.bind(first);
      vi.spyOn(first, "setCustomValidity").mockImplementationOnce((value) => {
        set(value);
        if (mode === "dispose") star.dispose();
        if (mode === "newer") ui.form.setErrors(form, { first: "Newer" }, { focus: false });
        if (mode === "replace") first.replaceWith(owner.document.createElement("input"));
        if (mode === "reassociate") first.setAttribute("form", "another-form");
        if (mode === "value") first.value = "Edited";
      });
      ui.form.setErrors(form, { first: "Old", second: "Obsolete" }, { focus: false });
      expect(second.validity.customError).toBe(false);
      expect(changed).toHaveBeenCalledTimes(mode === "newer" ? 1 : 0);
      if (mode === "newer") expect(first.validationMessage).toBe("Newer");
    },
  );

  it("establishes intent before incoming error getters", () => {
    const { ui, form, first } = setup();
    const errors = {
      get first() {
        ui.form.setErrors(form, { first: "Newer" }, { focus: false });
        return "Older";
      },
    };
    ui.form.setErrors(form, errors, { focus: false });
    expect(first.validationMessage).toBe("Newer");
  });

  it("establishes intent before option getters", () => {
    const { ui, form, first } = setup();
    ui.form.setErrors(
      form,
      { first: "Old" },
      {
        get replace() {
          ui.form.setErrors(form, { first: "Newer" }, { focus: false });
          return true;
        },
        focus: false,
      },
    );
    expect(first.validationMessage).toBe("Newer");
  });

  it("stops after Field message replacement during a live write", () => {
    const { ui, form, first, second, message, owner } = setup();
    ui.enhance(form);
    const set = first.setAttribute.bind(first);
    vi.spyOn(first, "setAttribute").mockImplementation((name, value) => {
      set(name, value);
      if (name === "aria-invalid") message.replaceWith(owner.document.createElement("p"));
    });
    const changed = vi.fn();
    form.addEventListener("jquery-star:form:server-invalid", changed);
    ui.form.setErrors(form, { first: "Old", second: "Obsolete" }, { focus: false });
    expect(message.textContent).toBe("");
    expect(second.validity.customError).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    ui.form.clearErrors(form);
    expect(first.hasAttribute("aria-invalid")).toBe(false);
  });

  it("stops focus when a notification replaces the invalid control", () => {
    const { ui, form, first, owner } = setup();
    const focus = vi.spyOn(first, "focus");
    form.addEventListener("jquery-star:form:server-invalid", () => {
      first.replaceWith(owner.document.createElement("input"));
    });
    ui.form.setErrors(form, { first: "Rejected" });
    expect(focus).not.toHaveBeenCalled();
  });

  it("ignores a queued invalid event after replacement", async () => {
    const { ui, form, first, owner } = setup();
    ui.enhance(form);
    const invalid = vi.fn();
    form.addEventListener("jquery-star:form:invalid", invalid);
    first.dispatchEvent(native(owner, "invalid"));
    first.replaceWith(owner.document.createElement("input"));
    await Promise.resolve();
    expect(invalid).not.toHaveBeenCalled();
  });

  it("does not submit after before-submit replaces the native roster", () => {
    const { ui, owner, form, first } = setup();
    ui.enhance(form);
    form.addEventListener("jquery-star:form:before-submit", () => first.remove());
    const submitted = vi.fn();
    form.addEventListener("jquery-star:form:submit", submitted);
    const event = native(owner, "submit");
    form.dispatchEvent(event);
    expect(submitted).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(["reset", "checkValidity", "reportValidity", "elements"])(
    "uses native Form behavior when %s is shadowed",
    (property) => {
      const { ui, form, first, owner } = setup();
      const control = owner.document.createElement("input");
      control.name = property;
      form.append(control);
      // jsdom lacks native named property shadowing. Browser coverage must prove that boundary.
      Object.defineProperty(form, property, { value: control, configurable: true });
      first.value = "Edited";
      if (property === "reset") {
        ui.form.reset(form);
        expect(first.value).toBe("");
      } else {
        first.value = "";
        expect(
          property === "elements"
            ? ui.form.valid(form)
            : ui.form.validate(form, {
                report: property === "reportValidity",
                focus: false,
              }),
        ).toBe(false);
      }
    },
  );
});

it.each([false, true])("Form adoption survives source disposal first=%s", async (disposeFirst) => {
  const source = install();
  const destination = install(realm());
  const { form, first } = fixture();
  source.ui.form.setErrors(form, { first: "Retained" }, { focus: false });
  destination.owner.document.adoptNode(form);
  if (disposeFirst) source.star.dispose();
  destination.ui.enhance(form);
  if (!disposeFirst) source.star.dispose();
  expect(first.validationMessage).toBe("Retained");
  first.value = "Ready";
  first.dispatchEvent(native(destination.owner, "input"));
  expect(first.validity.customError).toBe(false);
  first.value = "";
  const invalid = vi.fn();
  form.addEventListener("jquery-star:form:invalid", invalid);
  destination.ui.form.validate(form, { focus: false });
  await Promise.resolve();
  expect(invalid).toHaveBeenCalledOnce();
  expect(first.getAttribute("aria-invalid")).toBe("true");
  expect(() => source.ui.form.valid(form)).toThrow();
});

it("Form acquisition keeps a newer request from listener setup", () => {
  const { ui } = install();
  const { form, first } = fixture();
  const add = form.addEventListener.bind(form);
  vi.spyOn(form, "addEventListener").mockImplementationOnce((...args) => {
    add(...args);
    ui.form.setErrors(form, { first: "Newer" }, { focus: false });
  });
  ui.form.setErrors(form, { first: "Older" }, { focus: false });
  expect(first.validationMessage).toBe("Newer");
});

it("Form stops an older native validation after an invalid callback starts newer errors", async () => {
  const { ui } = install();
  const { form, first, second } = fixture();
  second.required = true;
  ui.enhance(form);
  first.addEventListener(
    "invalid",
    () => ui.form.setErrors(form, { first: "Newer" }, { focus: false }),
    { once: true },
  );
  const notified = vi.fn();
  form.addEventListener("jquery-star:form:invalid", notified);
  ui.form.validate(form, { focus: false });
  await Promise.resolve();
  expect(first.validationMessage).toBe("Newer");
  expect(second.hasAttribute("aria-invalid")).toBe(false);
  expect(notified).not.toHaveBeenCalled();
});

it("Form stops submission when before-submit changes native custom validity", () => {
  const { ui } = install();
  const { form, first } = fixture();
  first.value = "Ready";
  ui.enhance(form);
  form.addEventListener("jquery-star:form:before-submit", () => first.setCustomValidity("Changed"));
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:submit", submitted);
  const event = native(window, "submit");
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(submitted).not.toHaveBeenCalled();
});

it("Form preserves read-only validity inspection during before-submit", () => {
  const { ui } = install();
  const { form, first } = fixture();
  first.value = "Ready";
  ui.enhance(form);
  form.addEventListener("jquery-star:form:before-submit", () =>
    expect(ui.form.valid(form)).toBe(true),
  );
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:submit", submitted);
  const event = native(window, "submit");
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(submitted).toHaveBeenCalledOnce();
});

it("Form does not share mutable before-submit detail with the accepted event", () => {
  const { ui } = install();
  const { form } = fixture();
  ui.enhance(form);
  form.addEventListener("jquery-star:form:before-submit", (event) => {
    (event as CustomEvent<{ form: HTMLFormElement | null }>).detail.form = null;
  });
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:submit", submitted);
  form.dispatchEvent(native(window, "submit"));
  expect(submitted.mock.calls[0]?.[0].detail.form).toBe(form);
});

it("Form stops option reads after an earlier option starts a newer request", () => {
  const { ui } = install();
  const { form, first } = fixture();
  const focus = vi.fn(() => false);
  ui.form.setErrors(
    form,
    { first: "Older" },
    {
      get replace() {
        ui.form.setErrors(form, { first: "Newer" }, { focus: false });
        return true;
      },
      get focus() {
        return focus();
      },
    },
  );
  expect(first.validationMessage).toBe("Newer");
  expect(focus).not.toHaveBeenCalled();
});

it("Form cleanup reentry retains the newer destination record", () => {
  const source = install();
  const destination = install(realm());
  const { form, first } = fixture();
  source.ui.enhance(form);
  destination.owner.document.adoptNode(form);
  const remove = form.removeEventListener.bind(form);
  vi.spyOn(form, "removeEventListener").mockImplementationOnce((...args) => {
    remove(...args);
    destination.ui.form.setErrors(form, { first: "Newer" }, { focus: false });
  });
  destination.ui.form.setErrors(form, { first: "Older" }, { focus: false });
  source.star.dispose();
  expect(first.validationMessage).toBe("Newer");
  first.value = "Ready";
  first.dispatchEvent(native(destination.owner, "input"));
  expect(first.validity.customError).toBe(false);
});

it("Form clearing server errors preserves a newer authored custom validity message", () => {
  const { ui } = install();
  const { form, first } = fixture();
  ui.form.setErrors(form, { first: "Server" }, { focus: false });
  first.setCustomValidity("Authored validation");
  ui.form.clearErrors(form);
  expect(first.validationMessage).toBe("Authored validation");
});

it("Form can clear its partial native error after a setter changes the roster", () => {
  const { ui } = install();
  const { form, first, second } = fixture();
  ui.enhance(form);
  const set = first.setCustomValidity.bind(first);
  vi.spyOn(first, "setCustomValidity").mockImplementationOnce((value) => {
    set(value);
    second.remove();
  });
  ui.form.setErrors(form, { first: "Interrupted" }, { focus: false });
  expect(first.validationMessage).toBe("Interrupted");
  ui.form.clearErrors(form);
  expect(first.validity.customError).toBe(false);
});

it("Form clears an obsolete generated description after message replacement", () => {
  const { ui } = install();
  const { form, first, message } = fixture();
  ui.form.setErrors(form, { first: "Server" }, { focus: false });
  const replacement = document.createElement("p");
  replacement.dataset.part = "message";
  message.replaceWith(replacement);
  ui.form.clearErrors(form);
  expect(first.getAttribute("aria-describedby")).toBe("authored");
});

it("Form preserves an authored reference to its message", () => {
  const { ui } = install();
  const { form, first, message } = fixture();
  message.id = "authored-message";
  first.setAttribute("aria-describedby", "authored authored-message");
  ui.form.setErrors(form, { first: "Server" }, { focus: false });
  ui.form.clearErrors(form);
  expect(first.getAttribute("aria-describedby")).toBe("authored authored-message");
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name} fixture part.`);
  return value;
}

function control(root: HTMLElement): HTMLInputElement {
  const input = part(root, "control");
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing native control.");
  return input;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

function otp(): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "input-otp";
  root.dataset.length = "4";
  root.innerHTML =
    '<input data-part="control" value="1"><div data-part="slots"></div><p data-part="status"></p>';
  return root;
}

function tags(): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "tags-input";
  root.dataset.value = '["Original"]';
  root.dataset.name = "tags";
  root.innerHTML =
    '<ul data-part="list"></ul><input data-part="control" value="Draft"><p data-part="status"></p>';
  return root;
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Input OTP current parts", () => {
  it("normalizes a programmatic native value when focus synchronizes slots", async () => {
    const root = otp();
    document.body.append(root);
    await enhance(root);
    const changed = vi.fn();
    root.addEventListener("jquery-star:input-otp:change", changed);
    control(root).value = "１２a３４５";
    control(root).dispatchEvent(new Event("focus"));
    expect(control(root).value).toBe("1234");
    expect(part(root, "slots").textContent).toBe("1234");
    expect(root.dataset.state).toBe("complete");
    expect(changed).not.toHaveBeenCalled();
  });

  it("restores the configured length after a native maxlength change", async () => {
    const root = otp();
    document.body.append(root);
    await enhance(root);
    control(root).maxLength = 1;
    control(root).dispatchEvent(new Event("focus"));
    expect(control(root).maxLength).toBe(4);
    expect(part(root, "slots").children).toHaveLength(4);
  });

  it.each(["disabled", "readOnly"] as const)("refuses API edits to a %s control", async (flag) => {
    const root = otp();
    await enhance(root);
    control(root)[flag] = true;
    const changed = vi.fn();
    root.addEventListener("jquery-star:input-otp:change", changed);
    $.star.ui.inputOTP.set(root, "1234");
    expect(control(root).value).toBe("1");
    expect(part(root, "slots").textContent).toBe("1");
    expect(changed).not.toHaveBeenCalled();
  });
  it.each(["all", "control", "slots", "status"])(
    "uses current parts after replacing %s",
    async (name) => {
      const root = otp();
      document.body.append(root);
      await enhance(root);
      const old = control(root);
      const replacement = otp();
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else part(root, name).replaceWith(part(replacement, name));
      await enhance(root);
      $.star.ui.inputOTP.focus(root);
      expect(document.activeElement).toBe(control(root));
      const changed = vi.fn();
      root.addEventListener("jquery-star:input-otp:change", changed);
      $.star.ui.inputOTP.set(root, "1234");
      expect(control(root).value).toBe("1234");
      expect(part(root, "slots").textContent).toBe("1234");
      expect(part(root, "status").textContent).toBe("Code complete.");
      expect(changed).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            control: control(root),
            complete: true,
            value: "1234",
          }),
        }),
      );
      expect(control(root).autocomplete).toBe("one-time-code");
      if (!root.contains(old)) {
        expect(old.value).toBe("1");
        old.value = "9999";
        old.dispatchEvent(new Event("input", { bubbles: true }));
        expect($.star.ui.inputOTP.value(root)).toBe("1234");
      }
      control(root).value = "23";
      control(root).dispatchEvent(new Event("input", { bubbles: true }));
      expect($.star.ui.inputOTP.value(root)).toBe("23");
      expect(part(root, "status").textContent).toBe("");
    },
  );

  it("preserves the root value and one native binding across repeated enhancement", async () => {
    const root = otp();
    document.body.append(root);
    await enhance(root);
    root.dataset.value = "１２ab３４";
    await enhance(root);
    await enhance(root);
    expect(control(root).value).toBe("1234");
    const changed = vi.fn();
    root.addEventListener("jquery-star:input-otp:change", changed);
    control(root).value = "4";
    control(root).dispatchEvent(new Event("input"));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it.each([3, 6])("uses current native maxlength or the default length %i", async (length) => {
    const root = otp();
    document.body.append(root);
    await enhance(root);
    const replacement = document.createElement("input");
    replacement.dataset.part = "control";
    if (length === 3) replacement.maxLength = length;
    control(root).replaceWith(replacement);
    delete root.dataset.length;
    await enhance(root);
    $.star.ui.inputOTP.set(root, "12345678");
    expect(replacement.value).toBe("12345678".slice(0, length));
    expect(part(root, "slots").children).toHaveLength(length);
    expect(replacement.maxLength).toBe(length);
  });

  it("restores the current native control when a native edit is canceled", async () => {
    const root = otp();
    document.body.append(root);
    await enhance(root);
    const old = control(root);
    old.replaceWith(control(otp()));
    await enhance(root);
    root.addEventListener("jquery-star:input-otp:before-change", (event) => event.preventDefault());
    control(root).value = "2345";
    control(root).dispatchEvent(new Event("input", { bubbles: true }));
    expect(control(root).value).toBe("1");
    expect($.star.ui.inputOTP.value(root)).toBe("1");
    expect(part(root, "slots").textContent).toBe("1");
    expect(old.value).toBe("1");
  });
});

describe("Tags Input current parts", () => {
  it.each(["all", "control", "list", "status"])(
    "uses current parts after replacing %s",
    async (name) => {
      const root = tags();
      document.body.append(root);
      await enhance(root);
      const old = control(root);
      const oldList = part(root, "list");
      const replacement = tags();
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else part(root, name).replaceWith(part(replacement, name));
      await enhance(root);
      expect(control(root).value).toBe("Draft");
      expect(part(root, "list").textContent).toContain("Original");
      const oldText = oldList.textContent;
      $.star.ui.tagsInput.add(root, "Current");
      expect(part(root, "list").textContent).toContain("Current");
      expect(control(root).value).toBe("");
      expect(part(root, "status").textContent).toBe("Current added.");
      expect(control(root).getAttribute("aria-controls")).toBe(part(root, "list").id);
      expect(
        Array.from(
          root.querySelectorAll<HTMLInputElement>('input[name="tags"]'),
          (input) => input.value,
        ),
      ).toEqual(["Original", "Current"]);
      if (!root.contains(oldList)) expect(oldList.textContent).toBe(oldText);
      if (!root.contains(old)) {
        old.value = "Detached";
        old.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        expect($.star.ui.tagsInput.value(root)).toEqual(["Original", "Current"]);
      }
      control(root).value = "Native";
      control(root).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect($.star.ui.tagsInput.value(root)).toEqual(["Original", "Current", "Native"]);
      part(root, "remove").click();
      expect($.star.ui.tagsInput.value(root)).toEqual(["Current", "Native"]);
    },
  );

  it("rebuilds a cloned empty list even when it inherits the cached values", async () => {
    const root = tags();
    document.body.append(root);
    await enhance(root);
    const oldList = part(root, "list");
    oldList.replaceWith(oldList.cloneNode(false));
    await enhance(root);
    expect(part(root, "list").textContent).toContain("Original");
    const rendered = part(root, "list").firstElementChild;
    await enhance(root);
    expect(part(root, "list").firstElementChild).toBe(rendered);
  });
});

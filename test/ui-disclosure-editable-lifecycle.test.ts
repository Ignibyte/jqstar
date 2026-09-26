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

function editable(value = "Original"): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "editable";
  root.innerHTML = `<div data-part="display"><span data-part="preview"></span><button data-part="edit">Edit</button></div><div data-part="editor"><input data-part="control" value="${value}"></div><p data-part="status"></p>`;
  return root;
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Disclosure trigger ownership", () => {
  it.each(["trigger", "content", "both"])(
    "releases exact native listeners when %s changes",
    async (name) => {
      const root = document.createElement("details");
      root.dataset.jqs = "collapsible";
      root.innerHTML =
        '<summary data-part="trigger">Open</summary><div data-part="content">Content</div>';
      document.body.append(root);
      const old = part(root, "trigger");
      const added = vi.spyOn(old, "addEventListener");
      const removed = vi.spyOn(old, "removeEventListener");
      await enhance(root);
      if (name !== "content") old.replaceWith(old.cloneNode(true));
      if (name !== "trigger")
        part(root, "content").replaceWith(part(root, "content").cloneNode(true));
      await enhance(root);
      expect(removed.mock.calls).toHaveLength(2);
      expect(removed.mock.calls.map(([type, callback]) => [type, callback])).toEqual(
        added.mock.calls.slice(0, 2).map(([type, callback]) => [type, callback]),
      );
      const before = vi.fn();
      root.addEventListener("jquery-star:collapsible:before-open", before);
      if (!root.contains(old)) old.dispatchEvent(new MouseEvent("click", { cancelable: true }));
      expect(before).not.toHaveBeenCalled();
      const current = part(root, "trigger");
      current.click();
      await $.star.whenEnhanced();
      expect(root.open).toBe(true);
      expect(before).toHaveBeenCalledTimes(1);
      expect(current.getAttribute("aria-controls")).toBe(part(root, "content").id);
      await enhance(root);
      expect(current.getAttribute("aria-expanded")).toBe("true");
    },
  );
});

describe("Editable current parts", () => {
  it.each(["all", "display", "preview", "editor", "control", "edit", "status"])(
    "uses current parts after replacing %s",
    async (name) => {
      const root = editable();
      document.body.append(root);
      await enhance(root);
      const oldControl = control(root);
      const oldPreview = part(root, "preview");
      const replacement = editable("Replacement");
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else part(root, name).replaceWith(part(replacement, name));
      await enhance(root);
      const expected = ["all", "editor", "control"].includes(name) ? "Replacement" : "Original";
      expect($.star.ui.editable.value(root)).toBe(expected);
      expect(part(root, "preview").textContent).toBe(expected);
      expect(part(root, "editor").hidden).toBe(true);
      expect(part(root, "edit").getAttribute("aria-controls")).toBe(part(root, "editor").id);
      expect(part(root, "status").getAttribute("aria-live")).toBe("polite");
      const detachedValue = oldControl.value;
      const detachedPreview = oldPreview.textContent;
      $.star.ui.editable.set(root, "Current");
      expect(control(root).value).toBe("Current");
      expect(part(root, "preview").textContent).toBe("Current");
      expect(part(root, "status").textContent).toBe("Value updated.");
      if (!root.contains(oldControl)) expect(oldControl.value).toBe(detachedValue);
      if (!root.contains(oldPreview)) expect(oldPreview.textContent).toBe(detachedPreview);
      $.star.ui.editable.edit(root);
      const changed = vi.fn();
      root.addEventListener("jquery-star:editable:change", changed);
      if (!root.contains(oldControl))
        oldControl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(changed).not.toHaveBeenCalled();
      expect($.star.ui.editable.editing(root)).toBe(true);
      control(root).value = "Committed";
      control(root).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect($.star.ui.editable.value(root)).toBe("Committed");
      expect($.star.ui.editable.editing(root)).toBe(false);
      expect(changed).toHaveBeenCalledTimes(1);
      expect(changed).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ control: control(root), value: "Committed" }),
        }),
      );
    },
  );

  it.each(["all", "control"])(
    "preserves committed value and replacement draft while editing %s",
    async (name) => {
      const root = editable();
      document.body.append(root);
      await enhance(root);
      $.star.ui.editable.edit(root);
      control(root).value = "Old draft";
      const replacement = editable("New draft");
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else control(root).replaceWith(control(replacement));
      await enhance(root);
      expect($.star.ui.editable.value(root)).toBe("Original");
      expect(control(root).value).toBe("New draft");
      expect(part(root, "display").hidden).toBe(true);
      expect(part(root, "editor").hidden).toBe(false);
      $.star.ui.editable.cancel(root);
      expect(control(root).value).toBe("Original");
      expect(part(root, "display").hidden).toBe(false);
      expect(part(root, "editor").hidden).toBe(true);
    },
  );

  it("preserves a live draft and one key binding across unchanged enhancement", async () => {
    const root = editable();
    document.body.append(root);
    const input = control(root);
    const added = vi.spyOn(input, "addEventListener");
    const removed = vi.spyOn(input, "removeEventListener");
    await enhance(root);
    $.star.ui.editable.edit(root);
    input.value = "Live draft";
    await enhance(root);
    await enhance(root);
    expect(input.value).toBe("Live draft");
    expect($.star.ui.editable.value(root)).toBe("Original");
    expect(
      added.mock.calls.filter(([type]) => type === "keydown").length -
        removed.mock.calls.filter(([type]) => type === "keydown").length,
    ).toBe(1);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect($.star.ui.editable.value(root)).toBe("Live draft");
  });

  it("honors a changed explicit root value when a native control is replaced", async () => {
    const root = editable();
    document.body.append(root);
    await enhance(root);
    control(root).replaceWith(control(editable("Native")));
    root.dataset.value = "Explicit";
    await enhance(root);
    expect(control(root).value).toBe("Explicit");
    expect($.star.ui.editable.value(root)).toBe("Explicit");
  });
});

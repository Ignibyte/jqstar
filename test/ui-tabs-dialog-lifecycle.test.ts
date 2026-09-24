import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name} fixture part.`);
  return value;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

function tabs(): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "tabs";
  root.innerHTML =
    '<div data-part="list"><button data-part="trigger" data-value="a">A</button><button data-part="trigger" data-value="b">B</button></div><div data-part="panel" data-value="a">A content</div><div data-part="panel" data-value="b">B content</div>';
  return root;
}

function dialog(): HTMLDialogElement {
  const root = document.createElement("dialog");
  root.dataset.jqs = "dialog";
  root.innerHTML = '<h2 data-part="title">Title</h2><p data-part="description">Description</p>';
  return root;
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Tabs current trigger values", () => {
  it.each(["click", "focus", "keydown"])("uses a renamed current value for %s", async (name) => {
    const root = tabs();
    document.body.append(root);
    await enhance(root);
    const trigger = root.querySelector<HTMLElement>('[data-part="trigger"][data-value="b"]');
    const panel = root.querySelector<HTMLElement>('[data-part="panel"][data-value="b"]');
    if (!trigger || !panel) throw new Error("Missing second tab.");
    trigger.dataset.value = "c";
    panel.dataset.value = "c";
    await enhance(root);
    await enhance(root);
    const before = vi.fn();
    root.addEventListener("jquery-star:tabs:before-change", before);
    trigger.dispatchEvent(
      name === "keydown" ? new KeyboardEvent(name, { key: "Enter" }) : new Event(name),
    );
    expect($.star.ui.tabs.value(root)).toBe("c");
    expect(panel.hidden).toBe(false);
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("uses a replacement panel and releases callbacks from a removed trigger", async () => {
    const root = tabs();
    document.body.append(root);
    await enhance(root);
    const trigger = root.querySelector<HTMLElement>('[data-part="trigger"][data-value="b"]');
    const panel = root.querySelector<HTMLElement>('[data-part="panel"][data-value="b"]');
    if (!trigger || !panel) throw new Error("Missing second tab.");
    const nextPanel = document.createElement("div");
    nextPanel.dataset.part = "panel";
    nextPanel.dataset.value = "b";
    panel.replaceWith(nextPanel);
    await enhance(root);
    trigger.click();
    expect(nextPanel.hidden).toBe(false);
    const nextTrigger = trigger.cloneNode(true);
    trigger.replaceWith(nextTrigger);
    await enhance(root);
    $.star.ui.tabs.activate(root, "a");
    const before = vi.fn();
    root.addEventListener("jquery-star:tabs:before-change", before);
    trigger.click();
    expect(before).not.toHaveBeenCalled();
    expect($.star.ui.tabs.value(root)).toBe("a");
  });
});

describe("Dialog generated label ownership", () => {
  it.each(["title", "description", "both"])(
    "rebinds generated references after replacing %s",
    async (name) => {
      const root = dialog();
      document.body.append(root);
      await enhance(root);
      for (const target of name === "both" ? ["title", "description"] : [name]) {
        const replacement = document.createElement("p");
        replacement.dataset.part = target;
        replacement.textContent = "Current label";
        part(root, target).replaceWith(replacement);
      }
      await enhance(root);
      expect(part(root, "title").id).not.toBe("");
      expect(part(root, "description").id).not.toBe("");
      expect(root.getAttribute("aria-labelledby")).toBe(part(root, "title").id);
      expect(root.getAttribute("aria-describedby")).toBe(part(root, "description").id);
    },
  );

  it.each(["title", "description"])(
    "removes only its owned reference when %s is removed",
    async (name) => {
      const root = dialog();
      document.body.append(root);
      await enhance(root);
      part(root, name).remove();
      await enhance(root);
      expect(root.hasAttribute(name === "title" ? "aria-labelledby" : "aria-describedby")).toBe(
        false,
      );
    },
  );

  it("preserves authored references before and after initial enhancement", async () => {
    const root = dialog();
    root.setAttribute("aria-labelledby", "external-title");
    root.setAttribute("aria-describedby", "external-description");
    document.body.append(root);
    await enhance(root);
    root.replaceChildren(...dialog().childNodes);
    await enhance(root);
    expect(root.getAttribute("aria-labelledby")).toBe("external-title");
    expect(root.getAttribute("aria-describedby")).toBe("external-description");
    const managed = dialog();
    document.body.append(managed);
    await enhance(managed);
    managed.setAttribute("aria-labelledby", "caller-title");
    managed.setAttribute("aria-describedby", "caller-description");
    managed.replaceChildren(...dialog().childNodes);
    await enhance(managed);
    expect(managed.getAttribute("aria-labelledby")).toBe("caller-title");
    expect(managed.getAttribute("aria-describedby")).toBe("caller-description");
  });

  it("honors an authored aria-label and binds native events once", async () => {
    const root = dialog();
    document.body.append(root);
    await enhance(root);
    root.setAttribute("aria-label", "Explicit name");
    await enhance(root);
    await enhance(root);
    expect(root.hasAttribute("aria-labelledby")).toBe(false);
    expect(root.getAttribute("aria-label")).toBe("Explicit name");
    const beforeClose = vi.fn();
    root.addEventListener("jquery-star:dialog:before-close", beforeClose);
    root.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(beforeClose).toHaveBeenCalledTimes(1);
  });
});

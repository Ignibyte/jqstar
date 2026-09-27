import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import "../src/index";

const pointerEvents = ["pointermove", "pointerup", "pointercancel"];
let added: MockInstance<typeof window.addEventListener>;
let removed: MockInstance<typeof window.removeEventListener>;

beforeEach(() => {
  document.body.replaceChildren();
  added = vi.spyOn(window, "addEventListener");
  removed = vi.spyOn(window, "removeEventListener");
});
afterEach(() => {
  for (const [type, listener, options] of added.mock.calls) {
    if (pointerEvents.includes(type)) window.removeEventListener(type, listener, options);
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function parts(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
}
function handle(root: HTMLElement): HTMLElement {
  const value = parts(root, "handle")[0];
  if (!value) throw new Error("Missing fixture handle.");
  return value;
}
function live(type: string): number {
  const listeners = new Set(
    added.mock.calls.filter(([name]) => name === type).map(([, listener]) => listener),
  );
  for (const [name, listener] of removed.mock.calls) if (name === type) listeners.delete(listener);
  return listeners.size;
}
function pointer(target: EventTarget, type: string, x: number, id = 1): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x });
  Object.defineProperty(event, "pointerId", { value: id });
  target.dispatchEvent(event);
}
async function fixture(): Promise<HTMLElement> {
  const root = document.createElement("section");
  root.dataset.jqs = "resizable";
  root.dataset.value = "[50,50]";
  root.innerHTML =
    '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
  vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 100));
  document.body.append(root);
  await enhance(root);
  return root;
}
async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

describe("Resizable current parts and pointer ownership", () => {
  it.each(["all", "panel", "handle"])("uses current parts after replacing %s", async (name) => {
    const root = await fixture();
    const oldPanels = parts(root, "panel");
    const oldHandle = handle(root);
    if (name === "all") root.replaceChildren(...root.cloneNode(true).childNodes);
    else for (const part of parts(root, name)) part.replaceWith(part.cloneNode(true));
    await enhance(root);
    $.star.ui.resizable.set(root, [25, 75]);
    expect(parts(root, "panel").map((panel) => panel.dataset.size)).toEqual(["25", "75"]);
    expect(handle(root).getAttribute("aria-valuenow")).toBe("25");
    const change = vi.fn();
    root.addEventListener("jquery-star:resizable:change", change);
    handle(root).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect($.star.ui.resizable.value(root)).toEqual([30, 70]);
    expect(change).toHaveBeenCalledOnce();
    if (!root.contains(oldHandle)) {
      oldHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect($.star.ui.resizable.value(root)).toEqual([30, 70]);
    }
    if (!root.contains(oldPanels[0] ?? null))
      expect(oldPanels.map((panel) => panel.dataset.size)).toEqual(["50", "50"]);
  });

  it("validates replacement anatomy and accepts a new panel count", async () => {
    const root = await fixture();
    root.remove();
    handle(root).remove();
    expect(() => $.star.ui.enhance(root)).toThrow("one handle between each pair");
    root.innerHTML =
      '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
    root.dataset.value = "[20,30,50]";
    $.star.ui.enhance(root);
    expect($.star.ui.resizable.value(root)).toEqual([20, 30, 50]);
    expect(parts(root, "panel").map((panel) => panel.dataset.size)).toEqual(["20", "30", "50"]);
  });

  it("installs no idle window pointer listeners", async () => {
    const root = await fixture();
    await enhance(root);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
  });

  it("retains live sizes without an authored root value and applies current constraints", async () => {
    const root = await fixture();
    $.star.ui.resizable.set(root, [25, 75]);
    delete root.dataset.value;
    root.innerHTML =
      '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
    await enhance(root);
    expect($.star.ui.resizable.value(root)).toEqual([25, 75]);
    const first = parts(root, "panel")[0];
    if (!first) throw new Error("Missing current panel.");
    first.dataset.min = "40";
    await enhance(root);
    expect($.star.ui.resizable.value(root)).toEqual([40, 60]);
    expect(first.dataset.size).toBe("40");
  });

  it.each(["pointerup", "pointercancel"])("releases a live session on %s", async (end) => {
    const root = await fixture();
    handle(root).setPointerCapture = vi.fn();
    handle(root).releasePointerCapture = vi.fn();
    const ended = vi.fn();
    root.addEventListener("jquery-star:resizable:resize-end", ended);
    pointer(handle(root), "pointerdown", 100);
    expect(pointerEvents.map(live)).toEqual([1, 1, 1]);
    pointer(window, "pointermove", 150);
    expect($.star.ui.resizable.value(root)).toEqual([60, 40]);
    pointer(window, end, 150);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
    expect(handle(root).releasePointerCapture).toHaveBeenCalledWith(1);
    expect(ended).toHaveBeenCalledOnce();
    pointer(window, "pointermove", 200);
    expect($.star.ui.resizable.value(root)).toEqual([60, 40]);
  });

  it("cancels replaced parts and releases capture on the exact old handle", async () => {
    const root = await fixture();
    const old = handle(root);
    old.releasePointerCapture = vi.fn();
    pointer(old, "pointerdown", 100);
    old.replaceWith(old.cloneNode(true));
    await enhance(root);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
    expect(old.releasePointerCapture).toHaveBeenCalledWith(1);
    pointer(window, "pointermove", 200);
    expect($.star.ui.resizable.value(root)).toEqual([50, 50]);
  });

  it("finishes and releases listeners when pointer capture was already released", async () => {
    const root = await fixture();
    handle(root).releasePointerCapture = vi.fn(() => {
      throw new DOMException("Already released", "NotFoundError");
    });
    const ended = vi.fn();
    root.addEventListener("jquery-star:resizable:resize-end", ended);
    pointer(handle(root), "pointerdown", 100);
    pointer(window, "pointerup", 100);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
    expect(handle(root).dataset.state).toBe("idle");
    expect(ended).toHaveBeenCalledOnce();
  });

  it("preserves an unchanged live drag and cancels movement after disconnection", async () => {
    const root = await fixture();
    pointer(handle(root), "pointerdown", 100);
    await enhance(root);
    pointer(window, "pointermove", 150);
    expect($.star.ui.resizable.value(root)).toEqual([60, 40]);
    root.remove();
    pointer(window, "pointermove", 200);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
    expect($.star.ui.resizable.value(root)).toEqual([60, 40]);
  });

  it("replaces a prior pointer session without retaining its listeners", async () => {
    const root = await fixture();
    pointer(handle(root), "pointerdown", 100, 1);
    pointer(handle(root), "pointerdown", 100, 2);
    expect(pointerEvents.map(live)).toEqual([1, 1, 1]);
    pointer(window, "pointermove", 200, 1);
    expect($.star.ui.resizable.value(root)).toEqual([50, 50]);
    pointer(window, "pointerup", 100, 2);
    expect(pointerEvents.map(live)).toEqual([0, 0, 0]);
  });
});

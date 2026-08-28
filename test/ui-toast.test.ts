import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function viewport(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-jqs="toast-viewport"]')!;
}

function staticToast(): HTMLElement {
  return document.querySelector<HTMLElement>("#static-toast")!;
}

describe("jQuery Star Toast", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.toast.show('Saved from action')">Notify</button>
        <div data-jqs="toast-viewport" data-duration="0" aria-label="Test notifications (F8)">
          <div id="static-toast" data-jqs="toast">
            <div data-part="title">Static title</div>
            <div data-part="description">Static description</div>
            <button data-part="close">×</button>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $.star.ui.toast.clear();
    $("#app").star("destroy");
    vi.useRealTimers();
  });

  it("wires viewport, group labelling, close semantics, and polite announcements", () => {
    expect(viewport().getAttribute("role")).toBe("region");
    expect(viewport().tabIndex).toBe(-1);
    expect(staticToast().getAttribute("role")).toBe("group");
    expect(staticToast().getAttribute("aria-labelledby")).toBe("static-toast-title");
    expect(staticToast().getAttribute("aria-describedby")).toBe("static-toast-description");
    expect(staticToast().dataset.state).toBe("open");
    expect(staticToast().querySelector('[data-part="close"]')?.getAttribute("aria-label")).toBe(
      "Dismiss notification",
    );
    const announcer = viewport().querySelector<HTMLElement>('[data-part="announcer"]')!;
    expect(announcer.getAttribute("role")).toBe("status");
    expect(announcer.textContent).toContain("Static title. Static description");
  });

  it("creates safe imperative and named-action toasts with cancelable dismissal", () => {
    const toast = $.star.ui.toast.show({
      description: "All checks passed",
      duration: false,
      priority: "assertive",
      title: "Verified",
      variant: "success",
    });
    expect(toast.dataset.variant).toBe("success");
    expect(toast.isConnected).toBe(true);
    expect(
      [...viewport().querySelectorAll<HTMLElement>('[data-part="announcer"]')]
        .at(-1)
        ?.getAttribute("role"),
    ).toBe("alert");

    const prevent = (event: Event): void => event.preventDefault();
    toast.addEventListener("jquery-star:toast:before-dismiss", prevent);
    $.star.ui.toast.dismiss(toast);
    expect(toast.isConnected).toBe(true);
    toast.removeEventListener("jquery-star:toast:before-dismiss", prevent);
    $.star.ui.toast.dismiss(toast);
    expect(toast.isConnected).toBe(false);

    $("#external").trigger("click");
    expect(viewport().querySelectorAll('[data-jqs="toast"]')).toHaveLength(2);
  });

  it("pauses and resumes automatic dismissal on pointer interaction", () => {
    vi.useFakeTimers();
    const toast = $.star.ui.toast.show({ description: "Temporary", duration: 100 });
    vi.advanceTimersByTime(60);
    toast.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(100);
    expect(toast.isConnected).toBe(true);
    toast.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(39);
    expect(toast.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(toast.isConnected).toBe(false);
  });

  it("supports the F8 viewport hotkey, Escape, actions, and action fallback validation", () => {
    $.star.ui.toast.clear();
    const toast = document.createElement("div");
    toast.dataset.jqs = "toast";
    toast.dataset.duration = "0";
    toast.innerHTML = `
      <div data-part="description">Undo is available</div>
      <button data-part="action" data-alt-text="Open history to undo">Undo</button>
    `;
    viewport().append(toast);
    $.star.ui.enhance(toast);
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "F8" }));
    expect(document.activeElement).toBe(viewport());

    const action = toast.querySelector<HTMLElement>('[data-part="action"]')!;
    action.focus();
    action.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(toast.isConnected).toBe(false);
    expect(document.activeElement).toBe(viewport());

    const invalid = document.createElement("div");
    invalid.dataset.jqs = "toast";
    invalid.innerHTML = `
      <div data-part="description">Needs an alternative</div>
      <button data-part="action">Undo</button>
    `;
    expect(() => $.star.ui.enhance(invalid)).toThrow(/data-alt-text/);
  });
});

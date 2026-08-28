import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#skills")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function remove(value: string): HTMLButtonElement {
  return Array.from(root().querySelectorAll<HTMLButtonElement>('[data-part="remove"]')).find(
    (button) => button.dataset.value === value,
  )!;
}

describe("jQuery Star Tags Input", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <div id="skills" data-jqs="tags-input" data-name="skills" data-max="3" data-value='["jQuery"]'>
            <ul data-part="list"></ul>
            <input data-part="control" type="text" aria-label="Skills">
            <span data-part="status"></span>
          </div>
        </form>
        <button id="external" data-on:click="@ui.tags-input.add('#skills', 'Datastar')">Add</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("adds through keyboard, API, and named actions while rejecting duplicates", () => {
    control().value = "Tailwind CSS";
    control().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect($.star.ui.tagsInput.value(root())).toEqual(["jQuery", "Tailwind CSS"]);
    expect(control().value).toBe("");

    $("#external").trigger("click");
    expect($.star.ui.tagsInput.value(root())).toEqual(["jQuery", "Tailwind CSS", "Datastar"]);

    $.star.ui.tagsInput.add(root(), "jquery");
    expect($.star.ui.tagsInput.value(root())).toHaveLength(3);
    expect(root().querySelector<HTMLElement>('[data-part="status"]')?.textContent).toContain(
      "already added",
    );
  });

  it("removes by button and Backspace and announces the result", () => {
    $.star.ui.tagsInput.add(root(), "Datastar");
    remove("jQuery").click();
    expect($.star.ui.tagsInput.value(root())).toEqual(["Datastar"]);
    expect(document.activeElement).toBe(control());

    control().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    expect($.star.ui.tagsInput.value(root())).toEqual([]);
  });

  it("serializes repeated native form fields and accepts server-patched JSON values", () => {
    $.star.ui.tagsInput.add(root(), "Datastar");
    const form = document.querySelector<HTMLFormElement>("#form")!;
    expect(new FormData(form).getAll("skills")).toEqual(["jQuery", "Datastar"]);
    expect(root().dataset.value).toBe('["jQuery","Datastar"]');

    root().dataset.value = '["backend systems","accessibility"]';
    $.star.ui.enhance(root());
    expect($.star.ui.tagsInput.value(root())).toEqual(["backend systems", "accessibility"]);
    expect(new FormData(form).getAll("skills")).toEqual(["backend systems", "accessibility"]);
  });

  it("supports cancelable changes and emits ordinary and component events", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    root().addEventListener("input", input);
    root().addEventListener("change", change);
    root().addEventListener("jquery-star:tags-input:change", lifecycle);
    root().addEventListener("jquery-star:tags-input:before-change", (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      if (detail.value === "blocked") event.preventDefault();
    });

    $.star.ui.tagsInput.add(root(), "allowed");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();

    $.star.ui.tagsInput.add(root(), "blocked");
    expect($.star.ui.tagsInput.value(root())).not.toContain("blocked");
  });
});

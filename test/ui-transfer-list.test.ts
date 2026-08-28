import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#permissions")!;
}

function control(part: "available" | "selected"): HTMLSelectElement {
  return root().querySelector<HTMLSelectElement>(`[data-part="${part}"]`)!;
}

function choose(part: "available" | "selected", values: string[]): void {
  const selected = new Set(values);
  const select = control(part);
  for (const option of Array.from(select.options)) option.selected = selected.has(option.value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("jQuery Star Transfer List", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="access-form">
          <div id="permissions" data-jqs="transfer-list" data-name="permissions" data-value='["write","review"]'>
            <label for="permissions-available">Available</label>
            <select id="permissions-available" data-part="available" multiple>
              <option value="read">Read components</option>
              <option value="deploy" disabled>Deploy releases</option>
            </select>
            <div data-part="controls">
              <button data-part="add">Add</button>
              <button data-part="add-all">Add all</button>
              <button data-part="remove">Remove</button>
              <button data-part="remove-all">Remove all</button>
            </div>
            <label for="permissions-selected">Assigned</label>
            <select id="permissions-selected" data-part="selected" multiple>
              <option value="write">Write components</option>
              <option value="review">Review changes</option>
            </select>
            <button data-part="move-up">Move up</button>
            <button data-part="move-down">Move down</button>
            <p data-part="status" aria-live="polite"></p>
          </div>
        </form>
        <button id="preset" data-on:click="@ui.transfer-list.set('#permissions', ['review', 'read'])">Apply preset</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("preserves native controls and serializes every assigned value", () => {
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review"]);
    expect(root().dataset.state).toBe("ready");
    expect(root().dataset.count).toBe("2");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("2 assigned");
    expect(
      new FormData(document.querySelector<HTMLFormElement>("#access-form")!).getAll("permissions"),
    ).toEqual(["write", "review"]);
    expect(root().querySelector<HTMLButtonElement>('[data-part="add"]')!.disabled).toBe(true);
    expect(root().querySelector<HTMLButtonElement>('[data-part="add-all"]')!.disabled).toBe(false);
  });

  it("moves selected options with controls, Enter, double-click, and the API", () => {
    choose("available", ["read"]);
    root().querySelector<HTMLButtonElement>('[data-part="add"]')!.click();
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review", "read"]);

    choose("selected", ["read"]);
    control("selected").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review"]);

    choose("available", ["read"]);
    control("available").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review", "read"]);

    $.star.ui.transferList.remove(root(), ["write"]);
    $.star.ui.transferList.add(root(), ["write"]);
    expect($.star.ui.transferList.value(root())).toEqual(["review", "read", "write"]);
  });

  it("reorders a selected group and applies named presets", () => {
    choose("selected", ["review"]);
    root().querySelector<HTMLButtonElement>('[data-part="move-up"]')!.click();
    expect($.star.ui.transferList.value(root())).toEqual(["review", "write"]);
    $.star.ui.transferList.down(root(), ["review"]);
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review"]);

    $("#preset").trigger("click");
    expect($.star.ui.transferList.value(root())).toEqual(["review", "read"]);
  });

  it("emits detailed cancelable changes and accepts server-patched membership", () => {
    const before = vi.fn((event: Event) => event.preventDefault());
    const changed = vi.fn();
    root().addEventListener("jquery-star:transfer-list:before-change", before);
    root().addEventListener("jquery-star:transfer-list:change", changed);
    $.star.ui.transferList.add(root(), ["read"]);
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review"]);
    expect(changed).not.toHaveBeenCalled();

    root().removeEventListener("jquery-star:transfer-list:before-change", before);
    root().dataset.value = '["read","review"]';
    $.star.ui.enhance(root());
    expect($.star.ui.transferList.value(root())).toEqual(["read", "review"]);
    expect(new Set(Array.from(control("available").options).map((option) => option.value))).toEqual(
      new Set(["write", "deploy"]),
    );
  });

  it("honors unavailable state and rejects ambiguous option contracts", () => {
    root().dataset.disabled = "true";
    $.star.ui.enhance(root());
    $.star.ui.transferList.removeAll(root());
    expect($.star.ui.transferList.value(root())).toEqual(["write", "review"]);
    expect(root().querySelectorAll<HTMLButtonElement>("button:disabled")).toHaveLength(6);

    const container = document.createElement("div");
    container.innerHTML =
      '<div id="duplicate" data-jqs="transfer-list"><select data-part="available" multiple><option value="same">One</option></select><select data-part="selected" multiple><option value="same">Two</option></select></div>';
    expect(() => $.star.ui.enhance(container.firstElementChild!)).toThrow(
      "option values must be unique",
    );

    container.innerHTML =
      '<div data-jqs="transfer-list"><select data-part="available" multiple><optgroup label="Group"><option value="nested">Nested</option></optgroup></select><select data-part="selected" multiple></select></div>';
    expect(() => $.star.ui.enhance(container.firstElementChild!)).toThrow(
      "options must be direct select children",
    );
  });

  it("does not create observed mutations during a repeated enhancement", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(root(), {
      attributes: true,
      attributeFilter: ["data-value", "disabled"],
      childList: true,
      subtree: true,
    });

    $.star.ui.enhance(root());
    await new Promise((resolve) => setTimeout(resolve, 0));
    observer.disconnect();
    expect(mutations).toEqual([]);
  });
});

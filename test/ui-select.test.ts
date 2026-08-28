import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#select")!;
}

function control(): HTMLSelectElement {
  return root().querySelector<HTMLSelectElement>(':scope > [data-part="control"]')!;
}

function trigger(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

function option(value: string): HTMLElement {
  return content().querySelector<HTMLElement>(`[data-part="option"][data-value="${value}"]`)!;
}

function key(value: string): void {
  trigger().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: value }));
}

describe("jQuery Star Select", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app" data-signals="{ foundation: 'jquery-star' }">
        <button id="external" data-on:click="@ui.select.select('#select', 'daisyui')">Choose daisyUI</button>
        <form id="form">
          <label for="select-control">Foundation</label>
          <div id="select" data-jqs="select">
            <select id="select-control" data-part="control" data-bind:foundation name="foundation">
              <optgroup label="Runtime">
                <option value="jquery-star">jQuery Star</option>
                <option value="datastar">Datastar</option>
              </optgroup>
              <optgroup label="References">
                <option value="disabled" disabled>Disabled</option>
                <option value="radix">Radix</option>
                <option value="daisyui">daisyUI</option>
              </optgroup>
            </select>
          </div>
        </form>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    if (root().dataset.state === "open") $.star.ui.select.close(root());
    $("#app").star("destroy");
  });

  it("generates combobox and listbox anatomy while retaining the native form value", () => {
    expect(control().dataset.enhanced).toBe("true");
    expect(control().hidden).toBe(true);
    expect(control().tabIndex).toBe(-1);
    expect(trigger().getAttribute("role")).toBe("combobox");
    expect(trigger().getAttribute("aria-labelledby")).toBe(control().labels?.[0]?.id);
    expect(trigger().getAttribute("aria-controls")).toBe(content().id);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("role")).toBe("listbox");
    expect(content().hidden).toBe(true);
    expect(option("jquery-star").getAttribute("aria-selected")).toBe("true");
    expect(option("disabled").getAttribute("aria-disabled")).toBe("true");
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).get("foundation")).toBe(
      "jquery-star",
    );
    expect($("#form").serialize()).toBe("foundation=jquery-star");
  });

  it("explores with arrows without committing, then commits with Enter", async () => {
    const input = vi.fn();
    const change = vi.fn();
    control().addEventListener("input", input);
    control().addEventListener("change", change);

    trigger().focus();
    key("ArrowDown");
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("jquery-star").id);

    key("ArrowDown");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("datastar").id);
    expect(control().value).toBe("jquery-star");

    key("Enter");
    await $.star.nextUpdate();
    expect(content().hidden).toBe(true);
    expect(control().value).toBe("datastar");
    expect(root().dataset.value).toBe("datastar");
    expect($.star.ui.select.value(root())).toBe("datastar");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect($("#app").star<{ foundation: string }>("state")?.foundation).toBe("datastar");
  });

  it("cancels exploration with Escape and skips disabled options", () => {
    trigger().click();
    key("End");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("daisyui").id);
    key("ArrowDown");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("jquery-star").id);
    key("ArrowUp");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("daisyui").id);

    key("Escape");
    expect(root().dataset.state).toBe("closed");
    expect(control().value).toBe("jquery-star");
    expect(trigger()).toBe(document.activeElement);
  });

  it("supports typeahead while closed and the named selection action", async () => {
    trigger().focus();
    key("r");
    expect(root().dataset.state).toBe("open");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(option("radix").id);
    key("Enter");
    expect(control().value).toBe("radix");

    $("#external").trigger("click");
    await $.star.nextUpdate();
    expect(control().value).toBe("daisyui");
    expect($("#app").star<{ foundation: string }>("state")?.foundation).toBe("daisyui");
  });

  it("supports cancelable lifecycle and value-change events", () => {
    const preventOpen = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:select:before-open", preventOpen, { once: true });
    $.star.ui.select.open(root());
    expect(preventOpen).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("closed");

    $.star.ui.select.open(root());
    root().addEventListener("jquery-star:select:before-change", (event) => event.preventDefault(), {
      once: true,
    });
    $.star.ui.select.select(root(), "radix");
    expect(control().value).toBe("jquery-star");
    expect(root().dataset.state).toBe("open");
  });

  it("synchronizes signal writes, form reset, and server-patched options", async () => {
    const state = $("#app").star<{ foundation: string }>("state")!;
    state.foundation = "radix";
    await $.star.nextUpdate();
    expect(control().value).toBe("radix");
    expect(trigger().querySelector('[data-part="value"]')?.textContent).toBe("Radix");

    document.querySelector<HTMLFormElement>("#form")!.reset();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await $.star.nextUpdate();
    expect(control().value).toBe("jquery-star");
    expect(state.foundation).toBe("jquery-star");

    const added = document.createElement("option");
    added.value = "new-system";
    added.textContent = "New system";
    control().append(added);
    root().dataset.value = "new-system";
    $.star.ui.enhance(root());
    await $.star.nextUpdate();
    expect(option("new-system").textContent).toBe("New system");
    expect(control().value).toBe("new-system");
    expect(state.foundation).toBe("new-system");
  });

  it("rejects duplicate option values", () => {
    const invalid = document.createElement("div");
    invalid.innerHTML = `
      <div id="duplicate-select" data-jqs="select">
        <select data-part="control">
          <option value="same">One</option>
          <option value="same">Two</option>
        </select>
      </div>
    `;
    expect(() => $.star.ui.enhance(invalid)).toThrow(/unique option values/);
  });
});

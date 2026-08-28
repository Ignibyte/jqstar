import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#combobox")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>(':scope > [data-part="control"]')!;
}

function valueControl(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>(':scope > [data-part="value"]')!;
}

function content(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

function option(value: string): HTMLElement {
  return content().querySelector<HTMLElement>(`[data-part="option"][data-value="${value}"]`)!;
}

function key(value: string): void {
  control().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: value }));
}

describe("jQuery Star Combobox", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app" data-signals="{ query: '', selection: '' }">
        <button id="external" data-on:click="@ui.combobox.select('#combobox', 'radix')">Choose Radix</button>
        <form id="form">
          <label for="combobox-control">Technology</label>
          <div id="combobox" data-jqs="combobox">
            <input id="combobox-control" data-part="control" data-bind:query name="query">
            <input data-part="value" data-bind:selection type="hidden" name="technology">
            <div data-part="content">
              <div data-part="option" data-value="jquery-star">jQuery Star</div>
              <div data-part="option" data-value="datastar">Datastar</div>
              <div data-part="option" data-value="disabled" data-disabled>Disabled</div>
              <div data-part="option" data-value="radix">Radix Primitives</div>
              <div data-part="empty">No matching technology</div>
            </div>
          </div>
        </form>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    if (root().dataset.state === "open") $.star.ui.combobox.close(root());
    $("#app").star("destroy");
  });

  it("wires editable combobox semantics and retains native form controls", () => {
    expect(control().getAttribute("role")).toBe("combobox");
    expect(control().getAttribute("aria-autocomplete")).toBe("list");
    expect(control().getAttribute("aria-controls")).toBe(content().id);
    expect(control().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("role")).toBe("listbox");
    expect(content().getAttribute("aria-labelledby")).toBe(control().labels?.[0]?.id);
    expect(content().hidden).toBe(true);
    expect(option("jquery-star").getAttribute("role")).toBe("option");
    expect(option("disabled").getAttribute("aria-disabled")).toBe("true");
    expect($("#form").serialize()).toBe("query=&technology=");
  });

  it("keeps focus in the input and commits only the active option with Enter", async () => {
    control().focus();
    key("ArrowDown");
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(control());
    expect(control().getAttribute("aria-activedescendant")).toBe(option("jquery-star").id);

    key("ArrowDown");
    expect(control().getAttribute("aria-activedescendant")).toBe(option("datastar").id);
    expect(valueControl().value).toBe("");

    key("Enter");
    await $.star.nextUpdate();
    expect(content().hidden).toBe(true);
    expect(control().value).toBe("Datastar");
    expect(valueControl().value).toBe("datastar");
    expect(root().dataset.value).toBe("datastar");
    expect(option("datastar").getAttribute("aria-selected")).toBe("true");
    expect($.star.ui.combobox.query(root())).toBe("Datastar");
    expect($.star.ui.combobox.value(root())).toBe("datastar");
    expect($("#app").star<{ query: string; selection: string }>("state")).toMatchObject({
      query: "Datastar",
      selection: "datastar",
    });
  });

  it("filters locally, skips disabled options, and clears a stale committed value", async () => {
    $.star.ui.combobox.select(root(), "datastar");
    control().value = "rad";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    await $.star.nextUpdate();

    expect(valueControl().value).toBe("");
    expect(option("jquery-star").hidden).toBe(true);
    expect(option("radix").hidden).toBe(false);
    expect(control().getAttribute("aria-activedescendant")).toBe(option("radix").id);
    expect($("#app").star<{ selection: string }>("state")?.selection).toBe("");

    key("Enter");
    expect(valueControl().value).toBe("radix");
    expect(control().value).toBe("Radix Primitives");
  });

  it("preserves an uncommitted query when Escape closes the popup", () => {
    control().value = "data";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(root().dataset.state).toBe("open");
    expect(valueControl().value).toBe("");

    key("Escape");
    expect(root().dataset.state).toBe("closed");
    expect(control().value).toBe("data");
    expect(valueControl().value).toBe("");
    expect(document.activeElement).toBe(control());
  });

  it("supports an inline listbox for command and dialog compositions", () => {
    root().setAttribute("data-inline", "");
    $.star.ui.enhance(root());

    expect(content().hasAttribute("popover")).toBe(false);
    expect(content().hidden).toBe(true);
    $.star.ui.combobox.open(root());
    expect(content().hidden).toBe(false);
    expect(content().style.left).toBe("");
    expect(content().style.top).toBe("");
    $.star.ui.combobox.close(root());
    expect(content().hidden).toBe(true);
  });

  it("supports named actions, API clearing, and cancelable selection", async () => {
    const prevent = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:combobox:before-select", prevent, { once: true });
    $.star.ui.combobox.select(root(), "radix");
    expect(prevent).toHaveBeenCalledOnce();
    expect(valueControl().value).toBe("");

    $("#external").trigger("click");
    await $.star.nextUpdate();
    expect(valueControl().value).toBe("radix");
    $.star.ui.combobox.clear(root());
    await $.star.nextUpdate();
    expect(control().value).toBe("");
    expect(valueControl().value).toBe("");
  });

  it("synchronizes form reset back to query and selection signals", async () => {
    $.star.ui.combobox.select(root(), "radix");
    await $.star.nextUpdate();
    expect(control().defaultValue).toBe("");
    document.querySelector<HTMLFormElement>("#form")!.reset();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await $.star.nextUpdate();

    expect(control().value).toBe("");
    expect(valueControl().value).toBe("");
    expect($("#app").star<{ query: string; selection: string }>("state")).toMatchObject({
      query: "",
      selection: "",
    });
  });

  it("synchronizes signal writes and recovers after server result replacement", async () => {
    const state = $("#app").star<{ query: string; selection: string }>("state")!;
    state.query = "star";
    await $.star.nextUpdate();
    expect(control().value).toBe("star");
    expect(option("jquery-star").hidden).toBe(false);
    expect(option("datastar").hidden).toBe(false);
    expect(option("radix").hidden).toBe(true);

    control().focus();
    $.star.ui.combobox.open(root());
    content().innerHTML = `
      <div data-part="option" data-value="tailwind">Tailwind CSS</div>
      <div data-part="option" data-value="bootstrap">Bootstrap</div>
      <div data-part="empty">No server matches</div>
    `;
    $.star.ui.enhance(root());
    expect(document.activeElement).toBe(control());
    expect(option("tailwind").getAttribute("role")).toBe("option");

    root().dataset.value = "tailwind";
    $.star.ui.enhance(root());
    await $.star.nextUpdate();
    expect(valueControl().value).toBe("tailwind");
    expect(control().value).toBe("Tailwind CSS");
    expect(state.selection).toBe("tailwind");
  });

  it("rejects duplicate option values", () => {
    const invalid = document.createElement("div");
    invalid.innerHTML = `
      <div id="duplicate-combobox" data-jqs="combobox">
        <input data-part="control">
        <div data-part="content">
          <div data-part="option" data-value="same">One</div>
          <div data-part="option" data-value="same">Two</div>
        </div>
      </div>
    `;
    expect(() => $.star.ui.enhance(invalid)).toThrow(/unique option values/);
  });
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function toggle(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>("#preview-toggle")!;
}

function group(selector = "#formatting"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function item(value: string, selector = "#formatting"): HTMLButtonElement {
  return group(selector).querySelector<HTMLButtonElement>(`[data-value=${value}]`)!;
}

describe("jQuery Star Toggle and Toggle Group", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="preview-toggle" data-jqs="toggle" type="button">Preview</button>
        <button id="external-toggle" data-on:click="@ui.toggle.toggle('#preview-toggle')">External</button>

        <div
          id="formatting"
          data-jqs="toggle-group"
          data-type="multiple"
          data-value="bold"
          data-name="format"
          aria-label="Formatting"
        >
          <button data-part="item" data-value="bold">Bold</button>
          <button data-part="item" data-value="italic">Italic</button>
          <button data-part="item" data-value="disabled" disabled>Disabled</button>
          <button data-part="item" data-value="underline">Underline</button>
        </div>

        <div
          id="alignment"
          data-jqs="toggle-group"
          data-required
          data-value="left"
          aria-label="Alignment"
        >
          <button data-part="item" data-value="left">Left</button>
          <button data-part="item" data-value="center">Center</button>
          <button data-part="item" data-value="right">Right</button>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("rejects a non-button element target without toggling the nearby native button", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Toggle application did not start.");
    const child = document.createElement("span");
    toggle().append(child);
    await expect(app.run("ui.toggle.toggle", { element: child, args: [child] })).rejects.toThrow(
      'Toggle target did not match a button[data-jqs="toggle"]',
    );
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);
    await app.run("ui.toggle.toggle", { args: [toggle()] });
    expect($.star.ui.toggle.pressed(toggle())).toBe(true);
    await app.run("ui.toggle.press", { args: ["#preview-toggle", false] });
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);
    await app.run("ui.toggle.toggle", { element: child });
    expect($.star.ui.toggle.pressed(toggle())).toBe(true);
  });

  it("rejects a non-button press target before treating it as a boolean", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Toggle application did not start.");
    const child = document.createElement("span");
    toggle().append(child);
    await expect(
      app.run("ui.toggle.press", { element: child, args: [child, true] }),
    ).rejects.toThrow('Toggle target did not match a button[data-jqs="toggle"]');
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);
    await app.run("ui.toggle.press", { args: [toggle(), true] });
    expect($.star.ui.toggle.pressed(toggle())).toBe(true);
    await app.run("ui.toggle.press", { element: child, args: [false] });
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);
  });

  it("maintains standalone pressed state through pointer, API, and named actions", () => {
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    toggle().click();
    expect(toggle().dataset.state).toBe("on");
    expect($.star.ui.toggle.pressed(toggle())).toBe(true);

    $("#external-toggle").trigger("click");
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);

    $.star.ui.toggle.press(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
  });

  it("accepts its native button as a named-action target", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Toggle application did not start.");

    await app.run("ui.toggle.toggle", { args: [toggle()] });
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    await app.run("ui.toggle.press", { args: [toggle(), false] });
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    const external = document.getElementById("external-toggle");
    if (!external) throw new Error("Missing external Toggle action.");
    await expect(
      app.run("ui.toggle.press", {
        element: toggle(),
        args: [external, true],
      }),
    ).rejects.toThrow('Toggle target did not match a button[data-jqs="toggle"]');
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    await app.run("ui.toggle.press", { element: toggle(), args: [true] });
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
  });

  it("accepts a Toggle Group element target without choosing an implicit group", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Toggle Group application did not start.");

    await app.run("ui.toggle-group.select", { args: [group(), "italic"] });
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
    await app.run("ui.toggle-group.toggle", { args: [group(), "italic"] });
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold"]);
    await expect(
      app.run("ui.toggle-group.select", {
        element: item("bold"),
        args: [toggle(), "italic"],
      }),
    ).rejects.toThrow('Toggle Group target did not match data-jqs="toggle-group"');
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold"]);
    await app.run("ui.toggle-group.select", { element: item("bold"), args: ["italic"] });
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
  });

  it("supports multiple values, ordered form fields, and cancelable changes", () => {
    const changed = vi.fn();
    group().addEventListener("jquery-star:toggle-group:change", changed);

    item("italic").click();
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
    expect(
      Array.from(group().querySelectorAll<HTMLInputElement>('input[name="format"]')).map(
        (input) => input.value,
      ),
    ).toEqual(["bold", "italic"]);
    expect(changed).toHaveBeenCalledOnce();

    group().addEventListener("jquery-star:toggle-group:before-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      if (detail.value === "underline") event.preventDefault();
    });
    item("underline").click();
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
  });

  it("enforces required single selection and accepts server-patched values", () => {
    const alignment = group("#alignment");
    item("left", "#alignment").click();
    expect($.star.ui.toggleGroup.value(alignment)).toBe("left");

    $.star.ui.toggleGroup.select(alignment, "center");
    expect($.star.ui.toggleGroup.value(alignment)).toBe("center");
    expect(item("left", "#alignment").getAttribute("aria-pressed")).toBe("false");

    alignment.dataset.value = "right";
    $.star.ui.enhance(alignment);
    expect($.star.ui.toggleGroup.value(alignment)).toBe("right");
  });

  it("uses orientation-aware roving focus and skips disabled items", () => {
    const bold = item("bold");
    const italic = item("italic");
    const underline = item("underline");
    expect(group().getAttribute("role")).toBe("toolbar");
    expect(group().getAttribute("aria-orientation")).toBe("horizontal");

    bold.focus();
    bold.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(italic);
    italic.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(underline);
    underline.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(bold);
  });

  it("does not take keyboard or focus ownership from a nested foreign button", () => {
    const bold = item("bold");
    const italic = item("italic");
    bold.focus();
    const wrapper = document.createElement("span");
    wrapper.innerHTML = '<button data-part="item" data-value="foreign">Foreign</button>';
    group().append(wrapper);
    const foreign = wrapper.querySelector("button");
    if (!foreign) throw new Error("Missing foreign Toggle Group button.");

    const key = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    foreign.dispatchEvent(key);
    foreign.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(key.defaultPrevented).toBe(false);
    expect(bold.tabIndex).toBe(0);
    expect(italic.tabIndex).toBe(-1);
  });
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#meeting")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

describe("jQuery Star Time Picker", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <label for="meeting-control">Meeting time</label>
          <div id="meeting" data-jqs="time-picker">
            <button data-part="decrement">Earlier</button>
            <input id="meeting-control" data-part="control" type="time" name="meeting" min="08:00" max="18:00" step="900" value="09:00" required>
            <button data-part="increment">Later</button>
            <button data-part="preset" data-value="13:30">Afternoon</button>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="set" data-on:click="@ui.time-picker.set('#meeting', '10:45')">Set time</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("steps the native time input and preserves FormData", () => {
    $.star.ui.timePicker.increment(root());
    expect(control().value).toBe("09:15");
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).get("meeting")).toBe(
      "09:15",
    );
    root().querySelector<HTMLButtonElement>('[data-part="decrement"]')!.click();
    expect($.star.ui.timePicker.value(root())).toBe("09:00");
  });

  it("sets values through presets, API, named actions, and server patches", () => {
    root().querySelector<HTMLButtonElement>('[data-part="preset"]')!.click();
    expect(control().value).toBe("13:30");
    expect(root().querySelector('[data-part="preset"]')?.getAttribute("aria-pressed")).toBe("true");
    $("#set").trigger("click");
    expect(control().value).toBe("10:45");

    root().dataset.value = "11:30";
    $.star.ui.enhance(root());
    expect(control().value).toBe("11:30");
  });

  it("rejects invalid times and honors canceled changes", () => {
    const invalid = vi.fn();
    root().addEventListener("jquery-star:time-picker:invalid", invalid);
    $.star.ui.timePicker.set(root(), "20:00");
    expect(control().value).toBe("09:00");
    expect(invalid).toHaveBeenCalledOnce();

    root().addEventListener("jquery-star:time-picker:before-change", (event) =>
      event.preventDefault(),
    );
    $.star.ui.timePicker.set(root(), "10:00");
    expect(control().value).toBe("09:00");
  });

  it("emits ordinary and component changes", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    control().addEventListener("input", input);
    control().addEventListener("change", change);
    root().addEventListener("jquery-star:time-picker:change", lifecycle);
    $.star.ui.timePicker.set(root(), "10:00");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();
  });
});

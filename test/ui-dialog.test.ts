import $ from "jquery";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (): void {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (returnValue = ""): void {
    this.returnValue = returnValue;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
});

describe("jQuery Star dialog", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="open" data-on:click="@ui.dialog.open('#dialog', '#cancel')">Open</button>
        <dialog id="dialog" data-jqs="dialog" data-close-on-backdrop>
          <div data-part="content">
            <h2 data-part="title">Confirm action</h2>
            <p data-part="description">This can be cancelled.</p>
            <button id="cancel" data-on:click="@ui.dialog.close('cancelled')">Cancel</button>
          </div>
        </dialog>
      </main>
    `;
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("opens through a named action and wires accessible relationships", () => {
    $("#open").trigger("click");

    const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.state).toBe("open");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("dialog-description");
    expect($("#open").attr("aria-controls")).toBe("dialog");
    expect($("#open").attr("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.querySelector("#cancel"));
  });

  it("closes with a return value and restores focus to its trigger", () => {
    const trigger = document.querySelector<HTMLButtonElement>("#open")!;
    trigger.focus();
    $(trigger).trigger("click");
    $("#cancel").trigger("click");

    const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
    expect(dialog.open).toBe(false);
    expect(dialog.returnValue).toBe("cancelled");
    expect(dialog.dataset.state).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("allows applications to prevent a close", () => {
    $("#open").trigger("click");
    const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
    const prevent = vi.fn((event: Event) => event.preventDefault());
    dialog.addEventListener("jquery-star:dialog:before-close", prevent);

    $("#cancel").trigger("click");

    expect(prevent).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.state).toBe("open");
  });

  it("supports the programmatic API and optional backdrop dismissal", () => {
    const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
    $.star.ui.dialog.open(dialog);
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dialog.open).toBe(false);
    expect(dialog.returnValue).toBe("backdrop");
  });
});

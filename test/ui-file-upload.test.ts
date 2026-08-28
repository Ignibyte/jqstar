import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#assets")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function select(files: File[]): void {
  Object.defineProperty(control(), "files", { configurable: true, value: files });
  control().dispatchEvent(new Event("change", { bubbles: true }));
}

describe("jQuery Star File Upload", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <div id="assets" data-jqs="file-upload" data-max-files="2" data-max-size="1024">
            <input data-part="control" type="file" name="assets" accept="image/*,.pdf" multiple>
            <label data-part="dropzone">Choose or drop files</label>
            <ul data-part="list"></ul>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="clear" data-on:click="@ui.fileUpload.clear('#assets')">Clear</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps the native file input as the selected-file source", () => {
    const image = new File(["image"], "avatar.png", { type: "image/png" });
    select([image]);
    expect($.star.ui.fileUpload.files(root())).toEqual([image]);
    expect(Array.from(control().files ?? [])).toEqual([image]);
    expect(root().dataset.state).toBe("ready");
    expect(root().querySelector('[data-part="name"]')?.textContent).toBe("avatar.png");
    expect(root().querySelector<HTMLLabelElement>('[data-part="dropzone"]')?.htmlFor).toBe(
      control().id,
    );
  });

  it("validates count, size, and accepted type before committing", () => {
    const reject = vi.fn();
    root().addEventListener("jquery-star:file-upload:reject", reject);
    const image = new File(["ok"], "avatar.png", { type: "image/png" });
    const large = new File([new Uint8Array(2048)], "large.pdf", { type: "application/pdf" });
    const text = new File(["no"], "notes.txt", { type: "text/plain" });
    select([image, large, text]);
    expect($.star.ui.fileUpload.files(root())).toEqual([image]);
    expect(Array.from(control().files ?? [])).toEqual([image]);
    expect(reject).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("invalid");
    expect(root().querySelector('[data-part="status"]')?.textContent).toContain("larger");
  });

  it("removes and clears through controls and named actions", () => {
    const image = new File(["image"], "avatar.png", { type: "image/png" });
    const pdf = new File(["pdf"], "brief.pdf", { type: "application/pdf" });
    select([image, pdf]);
    root().querySelector<HTMLButtonElement>('[data-part="remove"]')!.click();
    expect($.star.ui.fileUpload.files(root())).toEqual([pdf]);
    $("#clear").trigger("click");
    expect($.star.ui.fileUpload.files(root())).toEqual([]);
    expect(root().dataset.state).toBe("empty");
  });

  it("supports cancelable changes and ordinary form events", () => {
    const input = vi.fn();
    const change = vi.fn();
    root().addEventListener("input", input);
    root().addEventListener("change", change);
    root().addEventListener("jquery-star:file-upload:before-change", (event) =>
      event.preventDefault(),
    );
    select([new File(["image"], "avatar.png", { type: "image/png" })]);
    expect($.star.ui.fileUpload.files(root())).toEqual([]);
    expect(Array.from(control().files ?? [])).toEqual([]);
    expect(input).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledOnce();
  });
});

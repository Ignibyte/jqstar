import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#editable")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function editButton(): HTMLButtonElement {
  return root().querySelector<HTMLButtonElement>('[data-part="edit"]')!;
}

function saveButton(): HTMLButtonElement {
  return root().querySelectorAll<HTMLButtonElement>('[data-part="editor"] button')[0]!;
}

describe("jQuery Star Editable", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="profile">
        <div id="editable" data-jqs="editable" data-select-on-edit>
          <div data-part="display">
            <span data-part="preview">Ada Lovelace</span>
            <button data-part="edit" data-on:click="@ui.editable.edit">Edit</button>
          </div>
          <div data-part="editor">
            <label for="editable-control">Display name</label>
            <input id="editable-control" data-part="control" name="displayName" value="Ada Lovelace" required>
            <button data-on:click="@ui.editable.commit">Save</button>
            <button data-on:click="@ui.editable.cancel">Cancel</button>
          </div>
          <span data-part="status"></span>
        </div>
      </form>
    `;
    $.star.ui.enhance(document);
    $("#profile").star();
  });

  afterEach(() => {
    $("#profile").star("destroy");
  });

  it("commits an edited native form value and emits lifecycle detail", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:editable:change", changed);

    editButton().click();
    expect($.star.ui.editable.editing(root())).toBe(true);
    expect(document.activeElement).toBe(control());
    control().value = "Grace Hopper";
    saveButton().click();

    expect($.star.ui.editable.editing(root())).toBe(false);
    expect($.star.ui.editable.value(root())).toBe("Grace Hopper");
    expect(root().querySelector('[data-part="preview"]')?.textContent).toBe("Grace Hopper");
    expect(
      new FormData(document.querySelector<HTMLFormElement>("#profile")!).get("displayName"),
    ).toBe("Grace Hopper");
    expect(changed).toHaveBeenCalledOnce();
    expect((changed.mock.calls[0]?.[0] as CustomEvent).detail.value).toBe("Grace Hopper");
  });

  it("rejects a wrong-kind element action target without editing the nearby control", async () => {
    const app = $("#profile").star("instance");
    if (!app) throw new Error("The Editable application did not start.");
    await expect(
      app.run("ui.editable.edit", { element: editButton(), args: [saveButton()] }),
    ).rejects.toThrow('Editable target did not match data-jqs="editable"');
    expect($.star.ui.editable.editing(root())).toBe(false);
    await app.run("ui.editable.edit", { args: [root()] });
    expect($.star.ui.editable.editing(root())).toBe(true);
    await app.run("ui.editable.cancel", { args: ["#editable"] });
    expect($.star.ui.editable.editing(root())).toBe(false);
    await app.run("ui.editable.edit", { element: editButton() });
    expect($.star.ui.editable.editing(root())).toBe(true);
  });

  it("cancels with Escape and restores the last committed value", () => {
    editButton().click();
    control().value = "Uncommitted";
    control().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    expect($.star.ui.editable.editing(root())).toBe(false);
    expect(control().value).toBe("Ada Lovelace");
    expect(root().querySelector('[data-part="preview"]')?.textContent).toBe("Ada Lovelace");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Edit canceled.");
  });

  it("commits a valid single-line control with Enter", () => {
    editButton().click();
    control().value = "Katherine Johnson";
    control().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));

    expect($.star.ui.editable.value(root())).toBe("Katherine Johnson");
    expect($.star.ui.editable.editing(root())).toBe(false);
  });

  it("keeps native-invalid drafts in edit mode", () => {
    const invalid = vi.fn();
    root().addEventListener("jquery-star:editable:invalid", invalid);
    editButton().click();
    control().value = "";

    $.star.ui.editable.commit(root());

    expect($.star.ui.editable.editing(root())).toBe(true);
    expect(control().validity.valueMissing).toBe(true);
    expect(invalid).toHaveBeenCalledOnce();
    expect(root().querySelector('[data-part="status"]')?.textContent).not.toBe("");
  });

  it("suppresses an edit completion retired during native selection", () => {
    const edited = vi.fn();
    root().addEventListener("jquery-star:editable:edit", edited);
    vi.spyOn(control(), "select").mockImplementation(() => {
      $.star.ui.editable.cancel(root());
    });
    $.star.ui.editable.edit(root());
    expect($.star.ui.editable.editing(root())).toBe(false);
    expect(edited).not.toHaveBeenCalled();
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Edit canceled.");
  });

  it("stops a stale commit when native validation cancels the edit", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:editable:change", changed);
    $.star.ui.editable.edit(root());
    control().value = "New draft";
    vi.spyOn(control(), "checkValidity").mockImplementation(() => {
      $.star.ui.editable.cancel(root());
      return true;
    });
    $.star.ui.editable.commit(root());
    expect($.star.ui.editable.editing(root())).toBe(false);
    expect($.star.ui.editable.value(root())).toBe("Ada Lovelace");
    expect(control().value).toBe("Ada Lovelace");
    expect(changed).not.toHaveBeenCalled();
  });

  it("suppresses invalid output after native validity reporting cancels the edit", () => {
    const invalid = vi.fn();
    root().addEventListener("jquery-star:editable:invalid", invalid);
    $.star.ui.editable.edit(root());
    control().value = "";
    vi.spyOn(control(), "reportValidity").mockImplementation(() => {
      $.star.ui.editable.cancel(root());
      return false;
    });
    $.star.ui.editable.commit(root());
    expect($.star.ui.editable.editing(root())).toBe(false);
    expect($.star.ui.editable.value(root())).toBe("Ada Lovelace");
    expect(invalid).not.toHaveBeenCalled();
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Edit canceled.");
  });

  it("leaves a newer edit open after native change reentry", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:editable:change", changed);
    $.star.ui.editable.edit(root());
    control().value = "Grace Hopper";
    control().addEventListener("change", () => $.star.ui.editable.edit(root()), { once: true });
    $.star.ui.editable.commit(root());
    expect($.star.ui.editable.value(root())).toBe("Grace Hopper");
    expect($.star.ui.editable.editing(root())).toBe(true);
    expect(document.activeElement).toBe(control());
    expect(changed).not.toHaveBeenCalled();
  });

  it("honors cancelable edits and changes", () => {
    const beforeEdit = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:editable:before-edit", beforeEdit);
    $.star.ui.editable.edit(root());
    expect($.star.ui.editable.editing(root())).toBe(false);
    root().removeEventListener("jquery-star:editable:before-edit", beforeEdit);

    $.star.ui.editable.edit(root());
    control().value = "Blocked";
    root().addEventListener("jquery-star:editable:before-change", (event) =>
      event.preventDefault(),
    );
    $.star.ui.editable.commit(root());

    expect($.star.ui.editable.editing(root())).toBe(true);
    expect($.star.ui.editable.value(root())).toBe("Ada Lovelace");
  });

  it("sets text-only values through the public API", () => {
    const value = '<img src=x onerror="throw 1">';
    $.star.ui.editable.set(root(), value);

    expect($.star.ui.editable.value(root())).toBe(value);
    expect(root().querySelector("img")).toBeNull();
    expect(root().querySelector('[data-part="preview"]')?.textContent).toBe(value);
  });
});

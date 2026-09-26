import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
const failedDisposals = new Set<ReturnType<typeof installStarCore>["star"]>();
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { jquery, star, ui: star.use(uiPlugin), owner };
}
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing fixture part");
  return value;
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow);
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const star of stars.splice(0).reverse()) {
    if (failedDisposals.delete(star)) expect(() => star.dispose()).toThrow();
    else star.dispose();
  }
  document.body.replaceChildren();
  vi.useRealTimers();
});
type Kind = "color-picker" | "file-upload" | "tree" | "transfer-list";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window): HTMLElement {
  const root = owner.document.createElement(kind === "tree" ? "ul" : "section");
  root.dataset.jqs = kind;
  root.id = "sample";
  if (kind === "tree") root.dataset.selection = "multiple";
  if (kind === "color-picker")
    root.innerHTML =
      '<input data-part="control" type="color" name="accent" value="#112233"><input data-part="value"><span data-part="preview"></span><button type="button" data-part="swatch" data-value="#445566">Next</button><p data-part="status"></p>';
  else if (kind === "file-upload")
    root.innerHTML =
      '<input data-part="control" type="file" multiple><label data-part="dropzone">Files</label><ul data-part="list"></ul><p data-part="status"></p>';
  else if (kind === "tree")
    root.innerHTML =
      '<li data-part="item" data-value="a"><div data-part="row"><span data-part="label">Alpha</span></div></li><li data-part="item" data-value="b"><div data-part="row"><span data-part="label">Beta</span></div></li>';
  else
    root.innerHTML =
      '<select data-part="available" multiple><option value="a">Alpha</option></select><select data-part="selected" multiple><option value="b">Beta</option></select><button type="button" data-part="add">Add</button><button type="button" data-part="remove">Remove</button><p data-part="status"></p>';
  owner.document.body.append(root);
  return root;
}
function part(root: HTMLElement, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function read(ui: UI, kind: Kind, root: HTMLElement | string) {
  if (kind === "color-picker") return ui.colorPicker.value(root);
  if (kind === "file-upload") return ui.fileUpload.files(root);
  if (kind === "transfer-list") return ui.transferList.value(root);
  return ui.tree.value(root);
}
function colorFixture(owner: Window = window) {
  const root = fixture("color-picker", owner);
  const form = owner.document.createElement("form");
  root.before(form);
  form.append(root);
  return {
    root,
    form,
    control: required(root.querySelector<HTMLInputElement>('[data-part="control"]')),
    text: required(root.querySelector<HTMLInputElement>('[data-part="value"]')),
  };
}
function colorEvents(root: HTMLElement): string[] {
  const changes: string[] = [];
  root.addEventListener("jquery-star:color-picker:change", (event) =>
    changes.push((event as CustomEvent<{ value: string }>).detail.value),
  );
  return changes;
}
describe.each(["color-picker", "file-upload", "tree", "transfer-list"] as const)(
  "%s document ownership",
  (kind) => {
    it.each(["element", "selector"] as const)("accepts its own foreign %s target", (mode) => {
      const { ui, owner } = install(realm());
      const root = fixture(kind, owner);
      ui.enhance(root);
      expect(() => read(ui, kind, mode === "element" ? root : "#sample")).not.toThrow();
    });
    it.each(["enhance", "facade"] as const)(
      "keeps native interaction after adopted %s and source disposal",
      (mode) => {
        const source = install();
        const destination = install(realm());
        const root = fixture(kind);
        source.ui.enhance(root);
        const owner = destination.owner as Window & typeof globalThis;
        owner.document.body.append(owner.document.adoptNode(root));
        if (mode === "enhance") destination.ui.enhance(root);
        else read(destination.ui, kind, root);
        source.star.dispose();
        if (kind === "color-picker") {
          part(root, "swatch").click();
          expect(required(root.querySelector("input")).value).toBe("#445566");
        } else if (kind === "file-upload") {
          const control = required(root.querySelector("input"));
          Object.defineProperty(control, "files", {
            configurable: true,
            value: [new owner.File(["a"], "a.txt", { type: "text/plain" })],
          });
          control.dispatchEvent(new owner.Event("change", { bubbles: true }));
          expect(root.dataset.state).toBe("ready");
          expect(part(root, "name").textContent).toBe("a.txt");
        } else if (kind === "tree") {
          required(root.querySelector<HTMLElement>('[data-value="b"] [data-part="row"]')).click();
          expect(root.dataset.value).toBe('["b"]');
        } else {
          const available = required(root.querySelector("select"));
          required(available.options[0]).selected = true;
          available.dispatchEvent(new owner.Event("change", { bubbles: true }));
          part(root, "add").click();
          expect(root.dataset.value).toBe('["b","a"]');
        }
      },
    );
  },
);

describe("Color Picker document lifetime", () => {
  it("automatically enhances a foreign document", async () => {
    const { star, owner } = install(realm());
    await star.whenEnhanced();
    const { root, control } = colorFixture(owner);
    await star.whenEnhanced();
    part(root, "swatch").click();
    expect(control.value).toBe("#445566");
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { jquery, owner } = install(realm());
    const { root, control } = colorFixture(owner);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit"
        ? "@ui.color-picker.set('#445566')"
        : "@ui.color-picker.set('#sample', '#445566')",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(control.value).toBe("#445566");
  });
  it("constructs adopted native and component events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root } = colorFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const component: Event[] = [];
    root.addEventListener("input", (event) => native.push(event));
    root.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:color-picker:change", (event) => component.push(event));
    destination.ui.colorPicker.set(root, "#445566");
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(2);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(component).toHaveLength(1);
    expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
  });
  it.each(["before", "after"] as const)(
    "preserves native edits and draft selection when source disposal is %s acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control, text } = colorFixture();
      source.ui.enhance(root);
      control.value = "#778899";
      text.value = "#draft";
      text.setSelectionRange(2, 5);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(control.value).toBe("#778899");
      expect(text.value).toBe("#draft");
      expect([text.selectionStart, text.selectionEnd]).toEqual([2, 5]);
      expect(root.dataset.value).toBe("#778899");
    },
  );
  it("preserves exact listeners and an invalid draft on unchanged enhancement", () => {
    const { ui } = install();
    const { root, control, text, form } = colorFixture();
    ui.enhance(root);
    text.value = "invalid";
    text.dispatchEvent(new Event("change", { bubbles: true }));
    text.setSelectionRange(1, 3);
    const adds = [root, control, text, form].map((target) => vi.spyOn(target, "addEventListener"));
    const removes = [root, control, text, form].map((target) =>
      vi.spyOn(target, "removeEventListener"),
    );
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(text.value).toBe("invalid");
    expect([text.selectionStart, text.selectionEnd]).toEqual([1, 3]);
    expect(text.getAttribute("aria-invalid")).toBe("true");
    expect(root.dataset.state).toBe("invalid");
  });
  it("keeps native defaults and FormData while applying initial and later root patches", () => {
    const { ui } = install();
    const { root, control, form } = colorFixture();
    root.dataset.value = "#445566";
    ui.enhance(root);
    expect(control.value).toBe("#445566");
    root.dataset.value = "#778899";
    ui.enhance(root);
    expect(new FormData(form).get("accent")).toBe("#778899");
    expect(control.defaultValue).toBe("#112233");
  });
  it("refreshes silent native values without overwriting a current text draft", () => {
    const { ui } = install();
    const { root, control, text } = colorFixture();
    ui.enhance(root);
    text.value = "draft";
    control.value = "#778899";
    ui.enhance(root);
    expect(root.dataset.value).toBe("#778899");
    expect(text.value).toBe("draft");
  });
  it.each(["input", "change"] as const)("reflects native %s edits once", (type) => {
    const { ui } = install();
    const { root, control, text } = colorFixture();
    ui.enhance(root);
    const changes = colorEvents(root);
    control.value = "#778899";
    control.dispatchEvent(new Event(type, { bubbles: true }));
    expect(root.dataset.value).toBe("#778899");
    expect(text.value).toBe("#778899");
    expect(changes).toEqual(["#778899"]);
  });
  it.each(["before-change", "input", "change"] as const)(
    "keeps newer work started during %s",
    (phase) => {
      const { ui } = install();
      const { root, control } = colorFixture();
      ui.enhance(root);
      const changes = colorEvents(root);
      (phase === "before-change" ? root : control).addEventListener(
        phase === "before-change" ? "jquery-star:color-picker:before-change" : phase,
        () => ui.colorPicker.set(root, "#778899"),
        { once: true },
      );
      ui.colorPicker.set(root, "#445566");
      expect(control.value).toBe("#778899");
      expect(changes).toEqual(["#778899"]);
    },
  );
  it.each(["noop", "invalid", "native"] as const)(
    "stops a canceled old request after a newer %s request",
    (mode) => {
      const { ui } = install();
      const { root, control } = colorFixture();
      ui.enhance(root);
      const changes = colorEvents(root);
      root.addEventListener(
        "jquery-star:color-picker:before-change",
        (event) => {
          if (mode === "native") control.value = "#778899";
          else ui.colorPicker.set(root, mode === "noop" ? "#112233" : "bad");
          event.preventDefault();
        },
        { once: true },
      );
      ui.colorPicker.set(root, "#445566");
      expect(control.value).toBe(mode === "native" ? "#778899" : "#112233");
      expect(changes).toEqual([]);
      if (mode === "invalid") expect(root.dataset.state).toBe("invalid");
    },
  );
  it.each(["disabled", "fieldset", "readonly", "root"] as const)(
    "ignores commits when %s disables the control",
    (mode) => {
      const { ui } = install();
      const { root, control } = colorFixture();
      ui.enhance(root);
      if (mode === "disabled") control.disabled = true;
      else if (mode === "readonly") control.readOnly = true;
      else if (mode === "root") root.dataset.disabled = "";
      else {
        const fieldset = document.createElement("fieldset");
        root.before(fieldset);
        fieldset.append(root);
        fieldset.disabled = true;
      }
      ui.colorPicker.set(root, "#445566");
      expect(control.value).toBe("#112233");
    },
  );
  it.each(["disabled", "alpha", "native"] as const)("rechecks %s after before-change", (mode) => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:color-picker:before-change",
      () => {
        if (mode === "disabled") control.disabled = true;
        else if (mode === "alpha") control.setAttribute("alpha", "");
        else control.value = "#778899";
      },
      { once: true },
    );
    ui.colorPicker.set(root, "#445566");
    expect(control.value).toBe(mode === "native" ? "#778899" : "#112233");
  });
  it("stops notifications after a native input callback disables the control", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    const changes = colorEvents(root);
    const native = vi.fn();
    control.addEventListener("input", () => {
      control.disabled = true;
    });
    control.addEventListener("change", native);
    ui.colorPicker.set(root, "#445566");
    expect(native).not.toHaveBeenCalled();
    expect(changes).toEqual([]);
  });
  it.each(["control", "value", "preview", "status"] as const)(
    "reacquires replaced %s parts from a facade",
    (name) => {
      const { ui } = install();
      const { root } = colorFixture();
      ui.enhance(root);
      const old = part(root, name);
      const replacement = old.cloneNode(true) as HTMLElement;
      old.replaceWith(replacement);
      ui.colorPicker.set(root, "#778899");
      expect(required(root.querySelector<HTMLInputElement>('[data-part="control"]')).value).toBe(
        "#778899",
      );
      if (name === "value") expect((replacement as HTMLInputElement).value).toBe("#778899");
      if (name === "preview")
        expect(replacement.getAttribute("aria-label")).toBe("Selected color #778899");
      if (name === "status") expect(replacement.getAttribute("aria-live")).toBe("polite");
    },
  );
  it("does not overwrite newer native input while canceling an older native transition", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:color-picker:before-change",
      (event) => {
        ui.colorPicker.set(root, "#778899");
        event.preventDefault();
      },
      { once: true },
    );
    control.value = "#445566";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(control.value).toBe("#778899");
  });
  it("restores an ordinary canceled native change", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    root.addEventListener("jquery-star:color-picker:before-change", (event) =>
      event.preventDefault(),
    );
    control.value = "#445566";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(control.value).toBe("#112233");
  });
  it.each(["composition", "alt", "ctrl", "meta", "shift"] as const)(
    "preserves %s Enter in the draft",
    (mode) => {
      const { ui } = install();
      const { root, control, text } = colorFixture();
      ui.enhance(root);
      text.value = "#445566";
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: mode === "composition",
        altKey: mode === "alt",
        ctrlKey: mode === "ctrl",
        metaKey: mode === "meta",
        shiftKey: mode === "shift",
      });
      text.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(control.value).toBe("#112233");
    },
  );
  it("preserves composition across adopted enhancement", () => {
    const source = install();
    const destination = install(realm());
    const { root, text, control } = colorFixture();
    source.ui.enhance(root);
    text.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    text.value = "#445566";
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    text.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    expect(control.value).toBe("#112233");
    text.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    text.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    expect(control.value).toBe("#445566");
  });
  it("ignores nested swatches and retains authored disabled choices", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    const nested = fixture("color-picker");
    nested.id = "nested";
    root.append(nested);
    const swatch = part(root, "swatch") as HTMLButtonElement;
    swatch.disabled = true;
    ui.enhance(root);
    expect(swatch.disabled).toBe(true);
    part(nested, "swatch").click();
    expect(control.value).toBe("#112233");
  });
  it("clears invalid draft state when a valid no-op is committed", () => {
    const { ui } = install();
    const { root, text } = colorFixture();
    ui.enhance(root);
    ui.colorPicker.set(root, "bad");
    ui.colorPicker.set(root, "#112233");
    expect(text.hasAttribute("aria-invalid")).toBe(false);
    expect(root.dataset.state).toBe("ready");
  });
  it.each(["accepted", "canceled", "newer", "enhance"] as const)(
    "owns %s native reset work",
    (mode) => {
      vi.useFakeTimers();
      const { ui } = install();
      const { root, control, form } = colorFixture();
      ui.enhance(root);
      ui.colorPicker.set(root, "#445566");
      const changes = colorEvents(root);
      if (mode === "canceled") form.addEventListener("reset", (event) => event.preventDefault());
      form.reset();
      if (mode === "newer") ui.colorPicker.set(root, "#778899");
      if (mode === "enhance") ui.enhance(root);
      vi.runAllTimers();
      expect(control.value).toBe(
        mode === "newer" ? "#778899" : mode === "canceled" ? "#445566" : "#112233",
      );
      expect(changes).toEqual(
        mode === "newer" ? ["#778899"] : mode === "canceled" ? [] : ["#112233"],
      );
    },
  );
  it("releases resources acquired during interrupted setup", () => {
    const { ui, star } = install();
    const { root, control } = colorFixture();
    const native = control.addEventListener.bind(control);
    const removed = vi.spyOn(control, "removeEventListener");
    vi.spyOn(control, "addEventListener").mockImplementation((type, listener, options) => {
      star.dispose();
      native(type, listener, options);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(removed).toHaveBeenCalled();
    control.value = "#445566";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.dataset.value).not.toBe("#445566");
  });
  it("sweeps remaining cleanup after one listener removal fails", () => {
    const { ui, star } = install();
    const { root, control, text, form } = colorFixture();
    ui.enhance(root);
    vi.spyOn(control, "removeEventListener").mockImplementationOnce(() => {
      throw new Error("remove failed");
    });
    const removed = [root, text, form].map((target) => vi.spyOn(target, "removeEventListener"));
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(removed.every((spy) => spy.mock.calls.length > 0)).toBe(true);
  });
});

describe("Color Picker continuation boundaries", () => {
  it("keeps a root patch written during before-change", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:color-picker:before-change",
      () => {
        root.dataset.value = "#778899";
      },
      { once: true },
    );
    ui.colorPicker.set(root, "#445566");
    ui.enhance(root);
    expect(control.value).toBe("#778899");
  });
  it("stops facade acquisition when replaced-record cleanup disposes the owner", () => {
    const { ui, star } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    const replacement = control.cloneNode(true) as HTMLInputElement;
    control.replaceWith(replacement);
    const remove = control.removeEventListener.bind(control);
    vi.spyOn(control, "removeEventListener").mockImplementation((type, listener, options) => {
      star.dispose();
      remove(type, listener, options);
    });
    expect(() => ui.colorPicker.set(root, "#445566")).not.toThrow();
    expect(replacement.value).toBe("#112233");
  });
  it("handles a nested native input event during synthetic input delivery", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    ui.enhance(root);
    const changes = colorEvents(root);
    control.addEventListener(
      "input",
      () => {
        control.value = "#778899";
        control.dispatchEvent(new Event("input", { bubbles: true }));
      },
      { once: true },
    );
    ui.colorPicker.set(root, "#445566");
    expect(root.dataset.value).toBe("#778899");
    expect(changes).toEqual(["#778899"]);
  });
  it("releases a reset handle returned after disposal", () => {
    const { ui, star } = install();
    const { root, form } = colorFixture();
    ui.enhance(root);
    const clear = vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);
    vi.spyOn(window as Window, "setTimeout").mockImplementation(() => {
      star.dispose();
      return 12345;
    });
    form.reset();
    expect(clear).toHaveBeenCalledWith(12345);
  });
  it("does not mistake CSS support for native color input support", () => {
    const { ui } = install();
    const { root, control } = colorFixture();
    control.setAttribute("alpha", "");
    vi.stubGlobal("CSS", { supports: vi.fn(() => true) });
    ui.enhance(root);
    ui.colorPicker.set(root, "red");
    expect(control.value).toBe("#112233");
    expect(root.dataset.state).toBe("invalid");
  });
});

function uploadFixture(owner: Window = window) {
  const root = fixture("file-upload", owner);
  const form = owner.document.createElement("form");
  root.before(form);
  form.append(root);
  const control = required(root.querySelector("input"));
  control.name = "assets";
  assignFiles(control, []);
  return { root, form, control };
}
function assignFiles(control: HTMLInputElement, files: File[]): void {
  Object.defineProperty(control, "files", { configurable: true, value: files });
}
function changeFiles(control: HTMLInputElement, files: File[]): void {
  assignFiles(control, files);
  const owner = required(control.ownerDocument.defaultView);
  control.dispatchEvent(new owner.Event("change", { bubbles: true }));
}
function uploadFile(name = "a.txt", body = name, owner: Window = window): File {
  return new (owner as Window & typeof globalThis).File([body], name, {
    type: "text/plain",
    lastModified: 123,
  });
}
function drag(
  root: HTMLElement,
  type: string,
  files: File[] = [],
  target: HTMLElement = root,
): Event {
  const owner = required(root.ownerDocument.defaultView);
  const event = new owner.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { types: ["Files"], files, dropEffect: "none" },
  });
  target.dispatchEvent(event);
  return event;
}
function uploadChanges(root: HTMLElement): File[][] {
  const changes: File[][] = [];
  root.addEventListener("jquery-star:file-upload:change", (event) =>
    changes.push((event as CustomEvent<{ files: File[] }>).detail.files),
  );
  return changes;
}

describe("File Upload document lifetime", () => {
  it("returns a replacement File with identical metadata while retaining list nodes", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const first = uploadFile("same.txt", "one");
    const second = uploadFile("same.txt", "two");
    changeFiles(control, [first]);
    const row = part(root, "item");
    const changes = uploadChanges(root);
    changeFiles(control, [second]);
    expect(ui.fileUpload.files(root)[0]).toBe(second);
    expect(part(root, "item")).toBe(row);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.[0]).toBe(second);
  });
  it.each(["enhance", "facade"] as const)(
    "respects a silent empty native selection through %s",
    (mode) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      changeFiles(control, [uploadFile()]);
      assignFiles(control, []);
      if (mode === "enhance") ui.enhance(root);
      expect(ui.fileUpload.files(root)).toEqual([]);
      if (mode === "enhance") expect(root.dataset.count).toBe("0");
    },
  );
  it("retains exact bindings on unchanged enhancement", () => {
    const { ui } = install();
    const { root, control, form } = uploadFixture();
    ui.enhance(root);
    const targets = [root, control, form];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });
  it("automatically enhances a foreign document", async () => {
    const { star, owner } = install(realm());
    await star.whenEnhanced();
    const { root, control } = uploadFixture(owner);
    await star.whenEnhanced();
    changeFiles(control, [uploadFile("foreign.txt", "data", owner)]);
    expect(part(root, "name").textContent).toBe("foreign.txt");
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { jquery, ui, owner } = install(realm());
    const { root, control } = uploadFixture(owner);
    ui.enhance(root);
    changeFiles(control, [uploadFile("a.txt", "a", owner)]);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit" ? "@ui.fileUpload.clear()" : "@ui.fileUpload.clear('#sample')",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(ui.fileUpload.files(root)).toEqual([]);
  });
  it.each(["before", "after"] as const)(
    "preserves native files, rows and drag depth with source disposal %s acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = uploadFixture();
      source.ui.enhance(root);
      changeFiles(control, [uploadFile()]);
      const row = part(root, "item");
      drag(root, "dragenter");
      drag(root, "dragenter");
      const silent = uploadFile("a.txt", "changed");
      assignFiles(control, [silent]);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(destination.ui.fileUpload.files(root)[0]).toBe(silent);
      expect(root.dataset.state).toBe("dragging");
      // Different size renders a new row, then stable enhancement retains it.
      const nextRow = part(root, "item");
      expect(nextRow).not.toBe(row);
      destination.ui.enhance(root);
      expect(part(root, "item")).toBe(nextRow);
      drag(root, "dragleave");
      expect(root.dataset.state).toBe("dragging");
      drag(root, "dragleave");
      expect(root.dataset.state).toBe("ready");
    },
  );
  it("constructs native and custom events in the adopted document", () => {
    const source = install();
    const destination = install(realm());
    const { root, control } = uploadFixture();
    source.ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const custom: Event[] = [];
    root.addEventListener("input", (event) => native.push(event));
    root.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:file-upload:change", (event) => custom.push(event));
    destination.ui.fileUpload.clear(root);
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(2);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(custom).toHaveLength(1);
    expect(custom[0]).toBeInstanceOf(constructors.CustomEvent);
  });
  it.each(["disabled", "fieldset", "root"] as const)(
    "prevents clear and remove when %s makes the input unavailable",
    (mode) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      const file = uploadFile();
      changeFiles(control, [file]);
      if (mode === "disabled") control.disabled = true;
      else if (mode === "root") root.dataset.disabled = "";
      else {
        const fieldset = document.createElement("fieldset");
        root.before(fieldset);
        fieldset.append(root);
        fieldset.disabled = true;
      }
      ui.fileUpload.remove(root, 0);
      ui.fileUpload.clear(root);
      expect(ui.fileUpload.files(root)[0]).toBe(file);
      expect(root.dataset.count).toBe("1");
    },
  );
  it("keeps newer native files when an older native selection is canceled", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    const newer = uploadFile("c.txt");
    root.addEventListener(
      "jquery-star:file-upload:before-change",
      (event) => {
        changeFiles(control, [newer]);
        event.preventDefault();
      },
      { once: true },
    );
    changeFiles(control, [uploadFile("b.txt")]);
    expect(ui.fileUpload.files(root)[0]).toBe(newer);
    expect(control.files?.[0]).toBe(newer);
  });
  it.each(["before-change", "change", "input"] as const)(
    "stops stale notifications when %s starts newer work",
    (phase) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      const first = uploadFile();
      const second = uploadFile("b.txt");
      changeFiles(control, [first, second]);
      const changes = uploadChanges(root);
      const nativeChange = vi.fn();
      root.addEventListener("change", nativeChange);
      root.addEventListener(
        phase === "input" ? phase : `jquery-star:file-upload:${phase}`,
        () => ui.fileUpload.clear(root),
        { once: true },
      );
      ui.fileUpload.remove(root, 0);
      expect(ui.fileUpload.files(root)).toEqual([]);
      expect(changes.at(-1)).toEqual([]);
      expect(nativeChange).toHaveBeenCalledTimes(1);
      expect(changes).toHaveLength(phase === "before-change" ? 1 : 2);
    },
  );
  it("allows a newer no-op request to supersede older work", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const file = uploadFile();
    changeFiles(control, [file]);
    const changes = uploadChanges(root);
    root.addEventListener(
      "jquery-star:file-upload:before-change",
      () => ui.fileUpload.remove(root, 99),
      { once: true },
    );
    ui.fileUpload.clear(root);
    expect(ui.fileUpload.files(root)[0]).toBe(file);
    expect(changes).toEqual([]);
  });
  it.each(["accept", "count", "size", "multiple", "disabled"] as const)(
    "rechecks %s after before-change during drop",
    (constraint) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      const file = uploadFile();
      changeFiles(control, [file]);
      root.addEventListener(
        "jquery-star:file-upload:before-change",
        () => {
          if (constraint === "accept") control.accept = ".png";
          else if (constraint === "count") root.dataset.maxFiles = "1";
          else if (constraint === "size") root.dataset.maxSize = "1";
          else if (constraint === "multiple") control.multiple = false;
          else control.disabled = true;
        },
        { once: true },
      );
      drag(root, "drop", [uploadFile("b.txt")]);
      expect(ui.fileUpload.files(root)).toHaveLength(1);
      expect(control.files?.[0]).toBe(file);
    },
  );
  it("honors a native single-file limit even when the root permits more", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    control.multiple = false;
    root.dataset.maxFiles = "4";
    ui.enhance(root);
    drag(root, "drop", [uploadFile(), uploadFile("b.txt")]);
    expect(ui.fileUpload.files(root)).toHaveLength(1);
  });
  it("stops rejected selection after a reject callback starts a newer operation", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    control.accept = ".png";
    root.addEventListener("jquery-star:file-upload:reject", () => ui.fileUpload.clear(root), {
      once: true,
    });
    drag(root, "drop", [uploadFile("bad.txt")]);
    expect(ui.fileUpload.files(root)).toEqual([]);
    expect(root.dataset.state).toBe("empty");
  });
  it.each(["before-change", "reject"] as const)(
    "does not expose commit arrays through %s details",
    (phase) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      const allowed = uploadFile();
      const injected = uploadFile("bad.png");
      control.accept = ".txt";
      root.addEventListener(`jquery-star:file-upload:${phase}`, (event) => {
        const detail = (event as CustomEvent<{ files: File[]; accepted?: File[] }>).detail;
        detail.files.push(injected);
        detail.accepted?.push(injected);
      });
      drag(root, "drop", phase === "reject" ? [allowed, injected] : [allowed]);
      expect(ui.fileUpload.files(root)).toHaveLength(1);
      expect(control.files?.[0]).toBe(allowed);
    },
  );
  it.each(["control", "list", "status", "dropzone"] as const)(
    "reacquires current %s from the facade",
    (name) => {
      const { ui } = install();
      const { root, control } = uploadFixture();
      ui.enhance(root);
      changeFiles(control, [uploadFile()]);
      const previous = part(root, name);
      const replacement = previous.cloneNode(false) as HTMLElement;
      previous.replaceWith(replacement);
      if (name === "control") assignFiles(replacement as HTMLInputElement, [uploadFile("new.txt")]);
      ui.fileUpload.files(root);
      if (name === "control") expect(part(root, "name").textContent).toBe("new.txt");
      if (name === "list") expect(replacement.children).toHaveLength(1);
      if (name === "status") expect(replacement.getAttribute("aria-live")).toBe("polite");
      if (name === "dropzone") expect(replacement.getAttribute("for")).toBe(control.id);
    },
  );
  it("scopes nested remove controls and drag events", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const file = uploadFile();
    changeFiles(control, [file]);
    const nested = fixture("file-upload");
    nested.id = "nested";
    root.append(nested);
    ui.enhance(nested);
    const nestedControl = required(nested.querySelector("input"));
    changeFiles(nestedControl, [uploadFile("nested.txt")]);
    part(nested, "remove").click();
    expect(ui.fileUpload.files(root)[0]).toBe(file);
    drag(root, "dragenter", [], nested);
    expect(root.dataset.state).toBe("ready");
    drag(root, "drop", [uploadFile("dropped.txt")], nested);
    expect(ui.fileUpload.files(root)).toHaveLength(1);
  });
  it("ignores fake removal outside the generated list", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const file = uploadFile();
    changeFiles(control, [file]);
    const fake = document.createElement("button");
    fake.type = "button";
    fake.dataset.part = "remove";
    fake.dataset.index = "0";
    root.append(fake);
    fake.click();
    expect(ui.fileUpload.files(root)[0]).toBe(file);
  });
  it("removes duplicate filenames by row index while the facade name removes the first", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const first = uploadFile("same.txt", "first");
    const second = uploadFile("same.txt", "second");
    changeFiles(control, [first, second]);
    required(root.querySelector<HTMLButtonElement>('[data-part="remove"][data-index="1"]')).click();
    expect(ui.fileUpload.files(root)[0]).toBe(first);
    changeFiles(control, [first, second]);
    ui.fileUpload.remove(root, "same.txt");
    expect(ui.fileUpload.files(root)[0]).toBe(second);
  });
  it.each(["accepted", "canceled", "newer", "enhance"] as const)(
    "guards %s queued native reset",
    async (mode) => {
      const { ui } = install();
      const { root, form, control } = uploadFixture();
      ui.enhance(root);
      const first = uploadFile();
      changeFiles(control, [first]);
      const queued: VoidFunction[] = [];
      const queue = vi
        .spyOn(window, "queueMicrotask")
        .mockImplementation((callback) => queued.push(callback));
      if (mode === "canceled") form.addEventListener("reset", (event) => event.preventDefault());
      form.reset();
      queue.mockRestore();
      if (mode !== "canceled") assignFiles(control, []);
      const newer = uploadFile("newer.txt");
      if (mode === "newer") changeFiles(control, [newer]);
      if (mode === "enhance") ui.enhance(root);
      const changes = uploadChanges(root);
      for (const callback of queued) callback();
      await Promise.resolve();
      expect(ui.fileUpload.files(root)).toHaveLength(
        mode === "accepted" || mode === "enhance" ? 0 : 1,
      );
      expect(changes).toEqual([]);
      if (mode === "newer") expect(root.dataset.state).toBe("ready");
      if (mode === "canceled") expect(control.files?.[0]).toBe(first);
    },
  );
  it("does not render a canceled reset after silent native changes", () => {
    const { ui } = install();
    const { root, form, control } = uploadFixture();
    ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    const queued: VoidFunction[] = [];
    const queue = vi
      .spyOn(window, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));
    form.addEventListener("reset", (event) => {
      event.preventDefault();
      assignFiles(control, []);
    });
    form.reset();
    queue.mockRestore();
    for (const callback of queued) callback();
    expect(root.dataset.count).toBe("1");
  });
  it("reassociates the current form and retires previous reset work", () => {
    const { ui } = install();
    const { root, form, control } = uploadFixture();
    ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    const queued: VoidFunction[] = [];
    const queue = vi
      .spyOn(window, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));
    form.reset();
    queue.mockRestore();
    const next = document.createElement("form");
    document.body.append(next);
    next.append(root);
    ui.fileUpload.files(root);
    changeFiles(control, [uploadFile("new.txt")]);
    const old = root.innerHTML;
    for (const callback of queued) callback();
    expect(root.innerHTML).toBe(old);
    const reset = vi.spyOn(next, "addEventListener");
    ui.enhance(root);
    expect(reset).not.toHaveBeenCalled();
  });
  it("sweeps cleanup after a listener removal fails", () => {
    const { ui, star } = install();
    const { root, control, form } = uploadFixture();
    ui.enhance(root);
    vi.spyOn(control, "removeEventListener").mockImplementationOnce(() => {
      throw new Error("remove failed");
    });
    const removed = [root, form].map((target) => vi.spyOn(target, "removeEventListener"));
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(removed.every((spy) => spy.mock.calls.length > 0)).toBe(true);
  });
  it("releases a listener acquired after setup disposal", () => {
    const { ui, star } = install();
    const { root, control } = uploadFixture();
    const add = control.addEventListener.bind(control);
    const removed = vi.spyOn(control, "removeEventListener");
    vi.spyOn(control, "addEventListener").mockImplementation((type, listener, options) => {
      star.dispose();
      add(type, listener, options);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(removed).toHaveBeenCalled();
  });
  it("stops facade continuation if retiring cleanup disposes the owner", () => {
    const { ui, star } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    const replacement = control.cloneNode() as HTMLInputElement;
    control.replaceWith(replacement);
    const file = uploadFile("new.txt");
    assignFiles(replacement, [file]);
    const remove = control.removeEventListener.bind(control);
    let retired = false;
    const removal = vi
      .spyOn(control, "removeEventListener")
      .mockImplementation((type, listener, options) => {
        retired = true;
        star.dispose();
        remove(type, listener, options);
      });
    try {
      expect(() => ui.fileUpload.clear(root)).not.toThrow();
      expect(replacement.files?.[0]).toBe(file);
      expect(retired).toBe(true);
    } finally {
      removal.mockRestore();
    }
  });
});

describe("File Upload native write and cleanup continuations", () => {
  it("retains newer drag state acquired during old listener cleanup", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    drag(root, "dragenter");
    const replacement = control.cloneNode() as HTMLInputElement;
    assignFiles(replacement, []);
    control.replaceWith(replacement);
    const remove = control.removeEventListener.bind(control);
    vi.spyOn(control, "removeEventListener").mockImplementationOnce((type, listener, options) => {
      remove(type, listener, options);
      ui.enhance(root);
      drag(root, "dragenter");
    });
    ui.enhance(root);
    expect(root.dataset.state).toBe("dragging");
    drag(root, "dragleave");
    expect(root.dataset.state).toBe("empty");
  });
  it("does not retain a stale rejection after silent adopted native replacement", () => {
    const source = install();
    const destination = install(realm());
    const { root, control } = uploadFixture();
    control.accept = ".png";
    source.ui.enhance(root);
    changeFiles(control, [uploadFile()]);
    expect(root.dataset.state).toBe("invalid");
    const file = uploadFile("good.png");
    assignFiles(control, [file]);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    source.star.dispose();
    destination.ui.enhance(root);
    expect(destination.ui.fileUpload.files(root)[0]).toBe(file);
    expect(root.dataset.state).toBe("ready");
    expect(part(root, "status").textContent).toBe("1 file selected.");
  });
  it("stops a native write after DataTransfer construction disposes the owner", () => {
    const { ui, star } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const first = uploadFile();
    const second = uploadFile("b.txt");
    changeFiles(control, [first, second]);
    const constructed = vi.fn();
    const add = vi.fn();
    vi.stubGlobal(
      "DataTransfer",
      class {
        items = { add };
        constructor() {
          constructed();
          star.dispose();
        }
      },
    );
    ui.fileUpload.remove(root, 0);
    expect(constructed).toHaveBeenCalledOnce();
    expect(add).not.toHaveBeenCalled();
    expect(control.files?.[0]).toBe(first);
    expect(control.files).toHaveLength(2);
  });
  it("does not replace a failed native setter with a shadow files property", () => {
    const { ui } = install();
    const { root, control } = uploadFixture();
    ui.enhance(root);
    const first = uploadFile();
    const second = uploadFile("b.txt");
    changeFiles(control, [first, second]);
    const getter = () => [first, second];
    Object.defineProperty(control, "files", {
      configurable: true,
      get: getter,
      set: () => {
        throw new Error("native write failed");
      },
    });
    vi.stubGlobal(
      "DataTransfer",
      class {
        files: File[] = [];
        items = {
          add: (file: File) => {
            this.files.push(file);
          },
        };
      },
    );
    expect(() => ui.fileUpload.remove(root, 0)).toThrow("native write failed");
    expect(Object.getOwnPropertyDescriptor(control, "files")?.get).toBe(getter);
    expect(control.files?.[0]).toBe(first);
  });
});

function treeFixture(owner: Window = window, mode: "single" | "multiple" | "none" = "multiple") {
  const root = fixture("tree", owner);
  root.dataset.selection = mode;
  root.innerHTML =
    '<li data-part="item" data-value="a" data-expanded="true"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Alpha</span></div><ul data-part="group"><li data-part="item" data-value="c"><div data-part="row"><span data-part="label">Bravo</span></div></li></ul></li><li data-part="item" data-value="b"><div data-part="row"><span data-part="label">Beta</span></div></li><li data-part="item" data-value="locked" data-disabled><div data-part="row"><span data-part="label">Locked</span></div></li>';
  const a = required(root.querySelector<HTMLElement>('[data-value="a"]'));
  const b = required(root.querySelector<HTMLElement>('[data-value="b"]'));
  const c = required(root.querySelector<HTMLElement>('[data-value="c"]'));
  return { root, a, b, c, row: part(a, "row"), group: part(a, "group") };
}
function treeKey(item: HTMLElement, key: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const owner = required(item.ownerDocument.defaultView);
  const event = new owner.KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  item.dispatchEvent(event);
  return event;
}
describe("Tree document lifetime", () => {
  it("automatically enhances a foreign document", async () => {
    const { star, ui, owner } = install(realm());
    await star.whenEnhanced();
    const { root, b } = treeFixture(owner);
    await star.whenEnhanced();
    part(b, "row").click();
    expect(ui.tree.value(root)).toEqual(["b"]);
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { ui, jquery, owner } = install(realm());
    const { root } = treeFixture(owner);
    const action = owner.document.createElement("button");
    action.type = "button";
    action.setAttribute(
      "data-on:click",
      mode === "implicit" ? "@ui.tree.select('b', true)" : "@ui.tree.select('#sample', 'b', true)",
    );
    root.append(action);
    jquery(root).star();
    action.click();
    expect(ui.tree.value(root)).toEqual(["b"]);
  });
  it("constructs adopted custom events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root } = treeFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const events: Event[] = [];
    root.addEventListener("jquery-star:tree:select", (event) => events.push(event));
    destination.ui.tree.select(root, "b", true);
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((destination.owner as Window & typeof globalThis).CustomEvent);
  });
  it.each(["before", "after"] as const)(
    "retains exploration and typeahead when source disposal is %s destination acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, a, b, c } = treeFixture();
      source.ui.enhance(root);
      source.ui.tree.select(root, "a", true);
      a.focus();
      treeKey(a, "b");
      expect(document.activeElement).toBe(c);
      source.ui.tree.focus(root, "b");
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(b.tabIndex).toBe(0);
      expect(a.dataset.expanded).toBe("true");
      expect(destination.ui.tree.value(root)).toEqual(["a"]);
      treeKey(b, "r");
      expect(destination.owner.document.activeElement).toBe(c);
    },
  );
  it("retains exact bindings and pending typeahead during unchanged enhancement", () => {
    const { ui } = install();
    const { root, a, b, c, row } = treeFixture();
    ui.enhance(root);
    a.focus();
    treeKey(a, "b");
    ui.tree.focus(root, "b");
    const targets = [root, a, b, c, row];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    treeKey(b, "r");
    expect(document.activeElement).toBe(c);
  });
  it("keeps newer selection started inside before-select", () => {
    const { ui } = install();
    const { root } = treeFixture(window, "single");
    ui.enhance(root);
    root.addEventListener("jquery-star:tree:before-select", () => ui.tree.select(root, "b", true), {
      once: true,
    });
    ui.tree.select(root, "a", true);
    expect(ui.tree.value(root)).toBe("b");
  });
  it("lets a newer no-op selection supersede an older selection", () => {
    const { ui } = install();
    const { root } = treeFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:tree:before-select",
      () => ui.tree.select(root, "a", false),
      { once: true },
    );
    ui.tree.select(root, "a", true);
    expect(ui.tree.value(root)).toEqual([]);
  });
  it.each(["disabled", "value", "mode", "root-patch", "root-disabled"] as const)(
    "rechecks %s after before-select",
    (mode) => {
      const { ui } = install();
      const { root, a } = treeFixture();
      ui.enhance(root);
      const selected = vi.fn();
      root.addEventListener("jquery-star:tree:select", selected);
      root.addEventListener(
        "jquery-star:tree:before-select",
        () => {
          if (mode === "disabled") a.dataset.disabled = "";
          else if (mode === "value") a.dataset.value = "changed";
          else if (mode === "mode") root.dataset.selection = "none";
          else if (mode === "root-patch") root.dataset.value = '["b"]';
          else root.dataset.disabled = "";
        },
        { once: true },
      );
      ui.tree.select(root, "a", true);
      expect(selected).not.toHaveBeenCalled();
      expect(root.dataset.value).toBe(mode === "root-patch" ? '["b"]' : "[]");
    },
  );
  it.each(["disabled", "group", "expanded", "newer"] as const)(
    "rechecks %s after before-collapse",
    (mode) => {
      const { ui } = install();
      const { root, a, group } = treeFixture();
      ui.enhance(root);
      const collapsed = vi.fn();
      root.addEventListener("jquery-star:tree:collapse", collapsed);
      root.addEventListener(
        "jquery-star:tree:before-collapse",
        () => {
          if (mode === "disabled") a.setAttribute("aria-disabled", "true");
          else if (mode === "group") group.replaceWith(group.cloneNode(true));
          else if (mode === "expanded") a.dataset.expanded = "false";
          else ui.tree.expand(root, "a");
        },
        { once: true },
      );
      ui.tree.collapse(root, "a");
      expect(collapsed).not.toHaveBeenCalled();
      if (mode !== "expanded") expect(a.dataset.expanded).toBe("true");
    },
  );
  it.each(["row", "shift-arrow"] as const)(
    "stops older selection after %s focus starts newer selection",
    (mode) => {
      const { ui } = install();
      const { root, a, c } = treeFixture(window, "single");
      ui.enhance(root);
      a.focus();
      c.addEventListener("focus", () => ui.tree.select(root, "b", true), { once: true });
      if (mode === "row") part(c, "row").click();
      else treeKey(a, "ArrowDown", { shiftKey: true });
      expect(ui.tree.value(root)).toBe("b");
    },
  );
  it("stops collapse notification when restored focus starts a newer expansion", () => {
    const { ui } = install();
    const { root, a } = treeFixture();
    ui.enhance(root);
    ui.tree.focus(root, "c");
    const collapsed = vi.fn();
    root.addEventListener("jquery-star:tree:collapse", collapsed);
    a.addEventListener("focus", () => ui.tree.expand(root, "a"), { once: true });
    ui.tree.collapse(root, "a");
    expect(a.dataset.expanded).toBe("true");
    expect(collapsed).not.toHaveBeenCalled();
  });
  it("stops ancestor focus when an expansion callback chooses another item", () => {
    const { ui } = install();
    const { root, a, b } = treeFixture();
    a.dataset.expanded = "false";
    ui.enhance(root);
    root.addEventListener("jquery-star:tree:expand", () => ui.tree.focus(root, "b"), {
      once: true,
    });
    ui.tree.focus(root, "c");
    expect(document.activeElement).toBe(b);
  });
  it.each(["composition", "ctrl", "meta", "alt"] as const)("preserves %s text keys", (mode) => {
    const { ui } = install();
    const { root, a } = treeFixture();
    ui.enhance(root);
    a.focus();
    const event = treeKey(a, "b", {
      isComposing: mode === "composition",
      ctrlKey: mode === "ctrl",
      metaKey: mode === "meta",
      altKey: mode === "alt",
    });
    expect(document.activeElement).toBe(a);
    expect(event.defaultPrevented).toBe(false);
  });
  it.each(["input", "button", "nested"] as const)("preserves %s row interaction", (kind) => {
    const { ui } = install();
    const { root, row } = treeFixture();
    const native = document.createElement(kind === "nested" ? "span" : kind);
    if (kind === "nested") native.dataset.jqs = "native-test";
    if (kind === "button") (native as HTMLButtonElement).type = "button";
    row.append(native);
    ui.enhance(root);
    native.click();
    expect(ui.tree.value(root)).toEqual([]);
  });
  it("respects canceled native row clicks", () => {
    const { ui } = install();
    const { root, row } = treeFixture();
    row.addEventListener("click", (event) => event.preventDefault());
    ui.enhance(root);
    row.click();
    expect(ui.tree.value(root)).toEqual([]);
  });
  it.each(["item", "row", "label", "group"] as const)(
    "reacquires a replaced %s through the facade",
    (name) => {
      const { ui } = install();
      const { root, a, group } = treeFixture();
      ui.enhance(root);
      const previous = name === "item" ? a : name === "group" ? group : part(a, name);
      const replacement = previous.cloneNode(true) as HTMLElement;
      previous.replaceWith(replacement);
      ui.tree.focus(root, name === "group" ? "c" : "a");
      const current = required(
        root.querySelector<HTMLElement>(`[data-value="${name === "group" ? "c" : "a"}"]`),
      );
      expect(document.activeElement).toBe(current);
      part(current, "row").click();
      expect(ui.tree.value(root)).toEqual([name === "group" ? "c" : "a"]);
      if (name === "label") expect(current.getAttribute("aria-labelledby")).toBe(replacement.id);
    },
  );
  it.each(["single", "multiple", "none"] as const)(
    "preserves the %s selection contract",
    (mode) => {
      const { ui } = install();
      const { root, a } = treeFixture(window, mode);
      ui.enhance(root);
      ui.tree.select(root, "a", true);
      ui.tree.select(root, "b", true);
      expect(ui.tree.value(root)).toEqual(
        mode === "single" ? "b" : mode === "multiple" ? ["a", "b"] : undefined,
      );
      if (mode === "none") expect(a.hasAttribute("aria-selected")).toBe(false);
    },
  );
  it("keeps hidden and disabled selections while select-all toggles visible enabled items", () => {
    const { ui } = install();
    const { root, a } = treeFixture();
    a.dataset.expanded = "false";
    root.dataset.value = '["c","locked"]';
    ui.enhance(root);
    a.focus();
    treeKey(a, "a", { ctrlKey: true });
    expect(ui.tree.value(root)).toEqual(["a", "c", "b", "locked"]);
    treeKey(a, "a", { metaKey: true });
    expect(ui.tree.value(root)).toEqual(["c", "locked"]);
  });
  it("rechecks select-all visibility and disabling after before-select", () => {
    const { ui } = install();
    const { root, a, b } = treeFixture();
    ui.enhance(root);
    a.focus();
    root.addEventListener(
      "jquery-star:tree:before-select",
      () => {
        b.dataset.disabled = "";
        a.dataset.expanded = "false";
      },
      { once: true },
    );
    treeKey(a, "a", { ctrlKey: true });
    expect(ui.tree.value(root)).toEqual([]);
  });
  it("clears generated disabled state while preserving authored disabled state", () => {
    const { ui } = install();
    const { root, b } = treeFixture();
    b.setAttribute("aria-disabled", "true");
    ui.enhance(root);
    const locked = required(root.querySelector<HTMLElement>('[data-value="locked"]'));
    delete locked.dataset.disabled;
    ui.enhance(root);
    expect(locked.getAttribute("aria-disabled")).not.toBe("true");
    expect(b.getAttribute("aria-disabled")).toBe("true");
    ui.tree.select(root, "locked", true);
    expect(ui.tree.value(root)).toEqual(["locked"]);
  });
  it.each(["aria-label", "aria-labelledby"] as const)(
    "preserves authored %s names",
    (attribute) => {
      const { ui } = install();
      const { root, a } = treeFixture();
      a.setAttribute(attribute, "Authored");
      ui.enhance(root);
      ui.enhance(root);
      expect(a.getAttribute(attribute)).toBe("Authored");
      if (attribute === "aria-label") expect(a.hasAttribute("aria-labelledby")).toBe(false);
    },
  );
  it("releases a typeahead handle returned after disposal", () => {
    const { ui, star } = install();
    const { root, a } = treeFixture();
    ui.enhance(root);
    const clear = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    vi.spyOn(window as Window, "setTimeout").mockImplementation(() => {
      star.dispose();
      return 12345;
    });
    treeKey(a, "b");
    expect(clear).toHaveBeenCalledWith(12345);
  });
  it("releases a listener that registers and then throws", () => {
    const { ui } = install();
    const { root, row } = treeFixture();
    const add = row.addEventListener.bind(row);
    const removed = vi.spyOn(row, "removeEventListener");
    const fault = vi
      .spyOn(row, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        add(type, listener, options);
        throw new Error("registration failed");
      });
    try {
      expect(() => ui.enhance(root)).toThrow("registration failed");
      expect(removed).toHaveBeenCalled();
    } finally {
      fault.mockRestore();
    }
  });
  it("sweeps all listener cleanup after one removal fails", () => {
    const { ui, star } = install();
    const { root, row, b } = treeFixture();
    ui.enhance(root);
    const removed = vi.spyOn(b, "removeEventListener");
    vi.spyOn(row, "removeEventListener").mockImplementationOnce(() => {
      throw new Error("removal failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(removed).toHaveBeenCalled();
  });
  it("stops older facade intent after cleanup acquires a newer focus", () => {
    const { ui } = install();
    const { root, row, b } = treeFixture();
    ui.enhance(root);
    row.replaceWith(row.cloneNode(true));
    const remove = row.removeEventListener.bind(row);
    const fault = vi
      .spyOn(row, "removeEventListener")
      .mockImplementationOnce((type, listener, options) => {
        remove(type, listener, options);
        ui.enhance(root);
        ui.tree.focus(root, "b");
      });
    try {
      ui.tree.focus(root, "a");
      expect(document.activeElement).toBe(b);
    } finally {
      fault.mockRestore();
    }
  });
  it("stops older typeahead focus after timer setup chooses a newer item", () => {
    const { ui } = install();
    const { root, a, b } = treeFixture();
    ui.enhance(root);
    a.focus();
    const schedule = window.setTimeout.bind(window);
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback, delay) => {
      ui.tree.focus(root, "b");
      return schedule(callback, delay);
    });
    treeKey(a, "b");
    expect(document.activeElement).toBe(b);
  });
});

describe("Tree expansion continuations", () => {
  it("stops sibling expansion after a callback patches selection directly", () => {
    const { ui } = install();
    const { root, a, b } = treeFixture();
    a.dataset.expanded = "false";
    b.dataset.expanded = "false";
    b.insertAdjacentHTML(
      "beforeend",
      '<ul data-part="group"><li data-part="item" data-value="d"><div data-part="row"><span data-part="label">Delta</span></div></li></ul>',
    );
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:tree:expand",
      () => {
        root.dataset.value = '["b"]';
      },
      { once: true },
    );
    treeKey(a, "*");
    expect(a.dataset.expanded).toBe("true");
    expect(b.dataset.expanded).toBe("false");
    expect(root.dataset.value).toBe('["b"]');
  });
  it("stops final focus after an expansion callback patches selection directly", () => {
    const { ui } = install();
    const { root, a, b } = treeFixture();
    a.dataset.expanded = "false";
    ui.enhance(root);
    b.focus();
    root.addEventListener(
      "jquery-star:tree:expand",
      () => {
        root.dataset.value = '["b"]';
      },
      { once: true },
    );
    ui.tree.focus(root, "c");
    expect(document.activeElement).toBe(b);
  });
  it("does not select or expand from a disabled span toggle", () => {
    const { ui } = install();
    const { root, a } = treeFixture();
    const toggle = part(a, "toggle");
    toggle.setAttribute("aria-disabled", "true");
    ui.enhance(root);
    toggle.click();
    expect(a.dataset.expanded).toBe("true");
    expect(ui.tree.value(root)).toEqual([]);
  });
  it("does not expand ancestors to focus a disabled child", () => {
    const { ui } = install();
    const { root, a, c } = treeFixture();
    a.dataset.expanded = "false";
    c.dataset.disabled = "";
    ui.enhance(root);
    ui.tree.focus(root, "c");
    expect(a.dataset.expanded).toBe("false");
  });
});

describe("Tree typeahead expiry", () => {
  it("retains the original expiry when adoption happens near the deadline", () => {
    vi.useFakeTimers();
    const source = install();
    const destination = install(realm());
    const { root, a, b } = treeFixture();
    source.ui.enhance(root);
    a.focus();
    treeKey(a, "b");
    source.ui.tree.focus(root, "b");
    vi.advanceTimersByTime(400);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    destination.ui.tree.focus(root, "b");
    vi.advanceTimersByTime(150);
    treeKey(b, "r");
    expect(destination.owner.document.activeElement).toBe(b);
  });
  it("ignores an old timer callback after a newer query is pending", () => {
    const { ui } = install();
    const { root, a, b, c } = treeFixture();
    ui.enhance(root);
    const callbacks: Array<() => void> = [];
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      callbacks.push(callback as () => void);
      return callbacks.length;
    });
    a.focus();
    treeKey(a, "b");
    treeKey(c, "r");
    required(callbacks[0])();
    ui.tree.focus(root, "b");
    treeKey(b, "a");
    expect(document.activeElement).toBe(c);
  });
});

describe("Tree acquisition continuation", () => {
  it("stops older facade intent after listener setup patches selection", () => {
    const { ui } = install();
    const { root, row } = treeFixture();
    const add = row.addEventListener.bind(row);
    const fault = vi
      .spyOn(row, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        add(type, listener, options);
        root.dataset.value = '["b"]';
      });
    try {
      ui.tree.select(root, "a", true);
      expect(root.dataset.value).toBe('["b"]');
    } finally {
      fault.mockRestore();
    }
  });
  it("releases a listener returned after setup disposes the owner", () => {
    const { ui, star } = install();
    const { root, row } = treeFixture();
    const add = row.addEventListener.bind(row);
    const removed = vi.spyOn(row, "removeEventListener");
    const fault = vi
      .spyOn(row, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        star.dispose();
        add(type, listener, options);
      });
    try {
      expect(() => ui.enhance(root)).toThrow();
      expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    } finally {
      fault.mockRestore();
    }
  });
});

function transferFixture(owner: Window = window) {
  const root = fixture("transfer-list", owner);
  root.dataset.name = "items";
  root.innerHTML =
    '<select data-part="available" multiple><option value="a">Alpha</option><option value="c">Charlie</option><option value="locked" disabled>Locked</option></select><select data-part="selected" multiple><option value="b">Beta</option></select><button type="button" data-part="add">Add</button><button type="button" data-part="add-all">All</button><button type="button" data-part="remove">Remove</button><button type="button" data-part="remove-all">Remove all</button><button type="button" data-part="move-up">Up</button><button type="button" data-part="move-down">Down</button><p data-part="status"></p>';
  const form = owner.document.createElement("form");
  root.before(form);
  form.append(root);
  const available = required(root.querySelector<HTMLSelectElement>('[data-part="available"]'));
  const selected = required(root.querySelector<HTMLSelectElement>('[data-part="selected"]'));
  const add = required(root.querySelector<HTMLButtonElement>('[data-part="add"]'));
  return { root, form, available, selected, add };
}
function transferChoose(control: HTMLSelectElement, values: string[]): void {
  for (const option of control.options) option.selected = values.includes(option.value);
  const owner = required(control.ownerDocument.defaultView);
  control.dispatchEvent(new owner.Event("change", { bubbles: true }));
}
function transferValues(root: HTMLElement): string[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>('input[data-jqs-generated="transfer-list"]'),
    (input) => input.value,
  );
}

describe("Transfer List document lifetime", () => {
  it("automatically enhances a foreign document", async () => {
    const { ui, star, owner } = install(realm());
    await star.whenEnhanced();
    const { root, available, add } = transferFixture(owner);
    await star.whenEnhanced();
    transferChoose(available, ["a"]);
    add.click();
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
  });
  it.each(["implicit", "explicit", "element"] as const)(
    "runs a foreign %s private action",
    async (mode) => {
      const { ui, jquery, owner } = install(realm());
      const { root } = transferFixture(owner);
      const action = owner.document.createElement("button");
      action.type = "button";
      action.setAttribute(
        "data-on:click",
        mode === "explicit"
          ? "@ui.transfer-list.add('#sample', ['a'])"
          : "@ui.transfer-list.add(['a'])",
      );
      root.append(action);
      const app = jquery(root).star();
      if (mode === "element")
        await app.star("instance")?.run("ui.transfer-list.add", { args: [root, ["a"]] });
      else action.click();
      expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    },
  );
  it.each(["before", "after", "facade"] as const)(
    "retains options, fields and highlights through %s source disposal",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, form, available, selected } = transferFixture();
      source.ui.enhance(root);
      transferChoose(available, ["a"]);
      const option = available.options[0];
      const field = root.querySelector("input");
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      if (mode === "before") source.star.dispose();
      if (mode === "facade") destination.ui.transferList.value(root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(available.options[0]).toBe(option);
      expect(option?.selected).toBe(true);
      expect(root.querySelector("input")).toBe(field);
      expect(Array.from(selected.options, (item) => item.value)).toEqual(["b"]);
      const events: Event[] = [];
      root.addEventListener("jquery-star:transfer-list:change", (event) => events.push(event));
      destination.ui.transferList.add(root);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
      expect(destination.ui.transferList.value(root)).toEqual(["b", "a"]);
    },
  );
  it("retains exact resources, options, fields and highlights on stable enhancement", () => {
    const { ui } = install();
    const { root, available, selected, add, form } = transferFixture();
    ui.enhance(root);
    transferChoose(available, ["a"]);
    const fields = Array.from(root.querySelectorAll("input"));
    const option = available.options[0];
    const targets = [root, available, selected, add, form];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    ui.enhance(root);
    ui.transferList.value(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(root.querySelector("input")).toBe(fields[0]);
    expect(available.options[0]).toBe(option);
    expect(option?.selected).toBe(true);
  });
  it("keeps newer membership started inside before-change", () => {
    const { ui } = install();
    const { root } = transferFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      () => ui.transferList.set(root, ["c"]),
      { once: true },
    );
    ui.transferList.add(root, ["a"]);
    expect(ui.transferList.value(root)).toEqual(["c"]);
  });
  it("lets a newer no-op set supersede an older add", () => {
    const { ui } = install();
    const { root } = transferFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      () => ui.transferList.set(root, ["b"]),
      { once: true },
    );
    ui.transferList.add(root, ["a"]);
    expect(ui.transferList.value(root)).toEqual(["b"]);
  });
  it("does not expose pending membership arrays to event mutation", () => {
    const { ui } = install();
    const { root } = transferFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      (event) => {
        const detail = (event as CustomEvent<{ value: string[]; previousValue: string[] }>).detail;
        detail.value.push("c");
        detail.previousValue.length = 0;
      },
      { once: true },
    );
    const changed = vi.fn();
    root.addEventListener("jquery-star:transfer-list:change", changed);
    ui.transferList.add(root, ["a"]);
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    const event = changed.mock.calls[0]?.[0] as CustomEvent<{ previousValue: string[] }>;
    expect(event.detail.previousValue).toEqual(["b"]);
  });
  it.each([
    "native-disabled",
    "root-disabled",
    "option-disabled",
    "value",
    "root-patch",
    "option-replaced",
    "highlight",
  ] as const)("rechecks %s after before-change", (mode) => {
    const { ui } = install();
    const { root, available } = transferFixture();
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener("jquery-star:transfer-list:change", changed);
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      () => {
        if (mode === "native-disabled") available.disabled = true;
        else if (mode === "root-disabled") root.dataset.disabled = "true";
        else if (mode === "option-disabled") required(available.options[0]).disabled = true;
        else if (mode === "value") required(available.options[0]).value = "new";
        else if (mode === "root-patch") root.dataset.value = '["c"]';
        else if (mode === "option-replaced")
          required(available.options[0]).replaceWith(
            required(available.options[0]).cloneNode(true),
          );
        else required(available.options[1]).selected = true;
      },
      { once: true },
    );
    ui.transferList.add(root, ["a"]);
    expect(changed).not.toHaveBeenCalled();
    expect(root.dataset.value).toBe(mode === "root-patch" ? '["c"]' : '["b"]');
  });
  it.each(["component", "input"] as const)(
    "stops older native notifications after %s starts newer work",
    (phase) => {
      const { ui } = install();
      const { root } = transferFixture();
      ui.enhance(root);
      const events: string[] = [];
      root.addEventListener(
        phase === "input" ? "input" : "jquery-star:transfer-list:change",
        () => ui.transferList.set(root, ["c"]),
        { once: true },
      );
      root.addEventListener("change", () => events.push(root.dataset.value ?? ""));
      ui.transferList.add(root, ["a"]);
      expect(events).toEqual(['["c"]']);
    },
  );
  it("preserves a root patch when a before-change callback cancels", () => {
    const { ui } = install();
    const { root } = transferFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      (event) => {
        root.dataset.value = '["c"]';
        event.preventDefault();
      },
      { once: true },
    );
    ui.transferList.add(root, ["a"]);
    expect(root.dataset.value).toBe('["c"]');
  });
  it.each(["available", "selected", "fieldset", "root"] as const)(
    "blocks changes and submission when %s is disabled",
    (mode) => {
      const { ui } = install();
      const { root, form, available, selected } = transferFixture();
      ui.enhance(root);
      if (mode === "available") available.disabled = true;
      else if (mode === "selected") selected.disabled = true;
      else if (mode === "root") root.dataset.disabled = "";
      else {
        const fieldset = document.createElement("fieldset");
        fieldset.disabled = true;
        form.append(fieldset);
        fieldset.append(root);
      }
      ui.transferList.add(root, ["a"]);
      expect(ui.transferList.value(root)).toEqual(["b"]);
      expect(new FormData(form).getAll("items")).toEqual([]);
    },
  );
  it("clears generated root ARIA after enabling while retaining authored ARIA", () => {
    const { ui } = install();
    const { root } = transferFixture();
    root.dataset.disabled = "true";
    ui.enhance(root);
    delete root.dataset.disabled;
    ui.enhance(root);
    ui.transferList.add(root, ["a"]);
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    root.setAttribute("aria-disabled", "true");
    ui.enhance(root);
    ui.transferList.removeAll(root);
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
  });
  it("preserves authored button disabling when native selection changes", () => {
    const { ui } = install();
    const { root, available, add } = transferFixture();
    add.disabled = true;
    ui.enhance(root);
    transferChoose(available, ["a"]);
    expect(add.disabled).toBe(true);
  });
  it("retains disabled assigned membership on set and excludes it from submission", () => {
    const { ui } = install();
    const { root, form, selected } = transferFixture();
    required(selected.options[0]).disabled = true;
    ui.enhance(root);
    ui.transferList.set(root, ["a", "locked"]);
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    expect(new FormData(form).getAll("items")).toEqual(["a"]);
  });
  it("ignores explicitly requested disabled reorder values", () => {
    const { ui } = install();
    const { root, selected } = transferFixture();
    ui.enhance(root);
    ui.transferList.set(root, ["a", "b"]);
    required(selected.options[1]).disabled = true;
    ui.transferList.up(root, ["b"]);
    expect(ui.transferList.value(root)).toEqual(["a", "b"]);
  });
  it("reflects silent native membership without restoring old root state", () => {
    const { ui } = install();
    const { root, available, selected } = transferFixture();
    ui.enhance(root);
    selected.append(required(available.options[0]));
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    expect(transferValues(root)).toEqual(["b", "a"]);
  });
  it("applies explicit root patches while retaining native highlights otherwise", () => {
    const { ui } = install();
    const { root, available } = transferFixture();
    ui.enhance(root);
    transferChoose(available, ["a"]);
    root.dataset.value = '["c","b"]';
    expect(ui.transferList.value(root)).toEqual(["c", "b"]);
    expect(transferValues(root)).toEqual(["c", "b"]);
  });
  it.each(["available", "selected", "add", "status"] as const)(
    "reacquires replaced %s through the facade",
    (name) => {
      const { ui } = install();
      const { root, available } = transferFixture();
      ui.enhance(root);
      const previous = part(root, name);
      const replacement = previous.cloneNode(true) as HTMLElement;
      previous.replaceWith(replacement);
      try {
        ui.transferList.add(root, ["a"]);
        expect(ui.transferList.value(root)).toEqual(["b", "a"]);
        expect(part(root, "status").textContent).toBe("2 assigned");
        if (name === "available") {
          available.dispatchEvent(new MouseEvent("dblclick"));
          expect(ui.transferList.value(root)).toEqual(["b", "a"]);
        }
        expect(
          Array.from(
            required(root.querySelector<HTMLSelectElement>('select[data-part="selected"]')).options,
            (option) => option.value,
          ),
        ).toEqual(["b", "a"]);
        expect(
          Array.from(
            required(root.querySelector<HTMLSelectElement>('select[data-part="available"]'))
              .options,
            (option) => option.value,
          ),
        ).toEqual(["c", "locked"]);
      } finally {
        root.remove();
      }
    },
  );
  it.each(["native-test", "button"])("scopes parts to the nearest %s controller", (kind) => {
    const { ui } = install();
    const { root } = transferFixture();
    const nested = document.createElement("div");
    nested.dataset.jqs = kind;
    nested.innerHTML =
      '<select data-part="available" multiple><option value="nested">Nested</option></select><button type="button" data-jqs="button" data-part="add-all">Nested action</button>';
    root.prepend(nested);
    ui.enhance(root);
    required(nested.querySelector("button")).click();
    expect(ui.transferList.value(root)).toEqual(["b"]);
    ui.transferList.addAll(root);
    expect(ui.transferList.value(root)).toEqual(["b", "a", "c"]);
  });
  it.each(["composition", "ctrl", "alt", "meta"] as const)(
    "preserves %s Enter in native controls",
    (mode) => {
      const { ui } = install();
      const { root, available } = transferFixture();
      ui.enhance(root);
      transferChoose(available, ["a"]);
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: mode === "composition",
        ctrlKey: mode === "ctrl",
        altKey: mode === "alt",
        metaKey: mode === "meta",
      });
      available.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(ui.transferList.value(root)).toEqual(["b"]);
    },
  );
  it("respects canceled native click and double-click", () => {
    const { ui } = install();
    const { root, available, add } = transferFixture();
    add.addEventListener("click", (event) => event.preventDefault());
    available.addEventListener("dblclick", (event) => event.preventDefault());
    ui.enhance(root);
    transferChoose(available, ["a"]);
    add.click();
    available.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    expect(ui.transferList.value(root)).toEqual(["b"]);
  });
  it("releases a listener that registers and then throws", () => {
    const { ui } = install();
    const { root, available } = transferFixture();
    const add = available.addEventListener.bind(available);
    const removed = vi.spyOn(available, "removeEventListener");
    const fault = vi
      .spyOn(available, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        add(type, listener, options);
        throw new Error("registration failed");
      });
    try {
      expect(() => ui.enhance(root)).toThrow("registration failed");
      expect(removed).toHaveBeenCalled();
    } finally {
      fault.mockRestore();
    }
  });
  it("sweeps cleanup after one native removal fails", () => {
    const { ui, star } = install();
    const { root, available, selected, form } = transferFixture();
    ui.enhance(root);
    const removed = [selected, form].map((target) => vi.spyOn(target, "removeEventListener"));
    vi.spyOn(available, "removeEventListener").mockImplementationOnce(() => {
      throw new Error("remove failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(removed.every((spy) => spy.mock.calls.length > 0)).toBe(true);
  });
  it("releases a listener returned after setup disposal", () => {
    const { ui, star } = install();
    const { root, available } = transferFixture();
    const add = available.addEventListener.bind(available);
    const removed = vi.spyOn(available, "removeEventListener");
    vi.spyOn(available, "addEventListener").mockImplementationOnce((type, listener, options) => {
      star.dispose();
      add(type, listener, options);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(removed).toHaveBeenCalled();
  });
  it("stops outer facade work after cleanup chooses newer membership", () => {
    const { ui } = install();
    const { root, available } = transferFixture();
    ui.enhance(root);
    available.replaceWith(available.cloneNode(true));
    const remove = available.removeEventListener.bind(available);
    const fault = vi
      .spyOn(available, "removeEventListener")
      .mockImplementationOnce((type, listener, options) => {
        remove(type, listener, options);
        ui.transferList.set(root, ["c"]);
      });
    try {
      ui.transferList.add(root, ["a"]);
      expect(ui.transferList.value(root)).toEqual(["c"]);
    } finally {
      fault.mockRestore();
      root.remove();
    }
  });
  it("stops outer facade work after listener setup patches root membership", () => {
    const { ui } = install();
    const { root, available } = transferFixture();
    const add = available.addEventListener.bind(available);
    vi.spyOn(available, "addEventListener").mockImplementationOnce((type, listener, options) => {
      add(type, listener, options);
      root.dataset.value = '["c"]';
    });
    ui.transferList.add(root, ["a"]);
    expect(root.dataset.value).toBe('["c"]');
  });
});

describe("Transfer List native reset lifetime", () => {
  it("retains assigned membership while native reset restores highlights and buttons", async () => {
    const { ui } = install();
    const { root, form, available, add } = transferFixture();
    required(available.options[0]).defaultSelected = true;
    ui.enhance(root);
    transferChoose(available, []);
    expect(add.disabled).toBe(true);
    form.reset();
    ui.enhance(root);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(available.options[0]?.selected).toBe(true);
    expect(add.disabled).toBe(false);
    expect(ui.transferList.value(root)).toEqual(["b"]);
    ui.transferList.add(root, ["a"]);
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    expect(new FormData(form).getAll("items")).toEqual(["b", "a"]);
  });
  it("honors late reset cancellation without changing native highlights", async () => {
    const { ui } = install();
    const { root, form, available, add } = transferFixture();
    required(available.options[0]).defaultSelected = true;
    ui.enhance(root);
    transferChoose(available, []);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(available.options[0]?.selected).toBe(false);
    expect(add.disabled).toBe(true);
  });
  it("cancels a reset handle returned after disposal", () => {
    const { ui, star } = install();
    const { root, form } = transferFixture();
    ui.enhance(root);
    const clear = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    vi.spyOn(window as Window, "setTimeout").mockImplementation(() => {
      star.dispose();
      return 12345;
    });
    form.reset();
    expect(clear).toHaveBeenCalledWith(12345);
  });
  it("rebinds both external native form owners", async () => {
    const { ui } = install();
    const { root, available, selected, form } = transferFixture();
    const external = document.createElement("form");
    external.id = "external-transfer";
    document.body.append(external);
    selected.setAttribute("form", external.id);
    required(selected.options[0]).defaultSelected = true;
    required(available.options[0]).defaultSelected = true;
    ui.enhance(root);
    transferChoose(available, []);
    transferChoose(selected, []);
    external.reset();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((part(root, "remove") as HTMLButtonElement).disabled).toBe(false);
    expect((part(root, "add") as HTMLButtonElement).disabled).toBe(true);
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((part(root, "add") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Transfer List native continuations", () => {
  it.each([false, true])(
    "accepts an SVG descendant click on an owned button (styled: %s)",
    (styled) => {
      const { ui } = install();
      const { root, available, add } = transferFixture();
      if (styled) add.dataset.jqs = "button";
      add.innerHTML = '<svg><path d="M0 0h1" /></svg>';
      ui.enhance(root);
      transferChoose(available, ["a"]);
      required(add.querySelector("path")).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      expect(ui.transferList.value(root)).toEqual(["b", "a"]);
    },
  );
  it.each([
    ["add", ["b", "a"]],
    ["add-all", ["b", "a", "c"]],
    ["remove", []],
    ["remove-all", []],
    ["move-up", ["a", "b", "c"]],
    ["move-down", ["b", "c", "a"]],
  ] as const)("accepts the styled native %s button", (operation, expected) => {
    const { ui } = install();
    const { root, available, selected } = transferFixture();
    for (const button of root.querySelectorAll("button")) button.dataset.jqs = "button";
    ui.enhance(root);
    if (operation.startsWith("move-")) {
      ui.transferList.set(root, ["b", "a", "c"]);
      transferChoose(selected, ["a"]);
    } else {
      transferChoose(available, ["a"]);
      transferChoose(selected, ["b"]);
    }
    part(root, operation).click();
    expect(ui.transferList.value(root)).toEqual(expected);
  });
  it("keeps a newer membership operation during queued reset work", async () => {
    const { ui } = install();
    const { root, form } = transferFixture();
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener("jquery-star:transfer-list:change", changed);
    form.reset();
    ui.transferList.set(root, ["c"]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(ui.transferList.value(root)).toEqual(["c"]);
    expect(changed).toHaveBeenCalledOnce();
  });
  it("releases the prior reset binding on form reassociation", async () => {
    const { ui } = install();
    const { root, form, available } = transferFixture();
    ui.enhance(root);
    const removed = vi.spyOn(form, "removeEventListener");
    const external = document.createElement("form");
    external.id = "new-transfer-form";
    document.body.append(external);
    available.setAttribute("form", external.id);
    required(available.options[0]).defaultSelected = true;
    ui.transferList.value(root);
    expect(removed).toHaveBeenCalledWith("reset", expect.any(Function));
    transferChoose(available, []);
    external.reset();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((part(root, "add") as HTMLButtonElement).disabled).toBe(false);
  });
  it("does not let a replaced option resume an older native notification", () => {
    const { ui } = install();
    const { root, selected } = transferFixture();
    ui.enhance(root);
    const input = vi.fn();
    root.addEventListener("input", input);
    root.addEventListener(
      "jquery-star:transfer-list:change",
      () => {
        const option = required(selected.options[0]);
        option.replaceWith(option.cloneNode(true));
      },
      { once: true },
    );
    ui.transferList.add(root, ["a"]);
    expect(input).not.toHaveBeenCalled();
  });
});

describe("Transfer List native option activation", () => {
  it("accepts a double-click targeted at an owned native option", () => {
    const { ui } = install();
    const { root, available } = transferFixture();
    ui.enhance(root);
    transferChoose(available, ["a"]);
    required(available.options[0]).dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
    expect(ui.transferList.value(root)).toEqual(["b", "a"]);
  });
});

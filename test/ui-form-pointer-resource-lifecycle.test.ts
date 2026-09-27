import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { withStarDOMRealm } from "../src/testing";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};

let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;
let added: MockInstance<typeof window.addEventListener>;
let removed: MockInstance<typeof window.removeEventListener>;
let register: typeof window.addEventListener;
const pointerTypes = ["pointermove", "pointerup", "pointercancel"];
const modes = ["render", "native", "dispose", "preserve"] as const;

beforeEach(() => {
  document.body.replaceChildren();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
  register = window.addEventListener.bind(window);
  added = vi.spyOn(window, "addEventListener");
  removed = vi.spyOn(window, "removeEventListener");
});

afterEach(() => {
  star.dispose();
  for (const [type, listener, options] of added.mock.calls) {
    if (pointerTypes.includes(type)) window.removeEventListener(type, listener, options);
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function boundary(root: HTMLElement, mode: (typeof modes)[number]) {
  if (mode === "dispose") star.dispose();
  else if (mode === "native") {
    root.remove();
    await star.whenEnhanced();
  } else {
    const render = createRenderAdapter(installed).begin(
      document.body,
      mode === "preserve" ? { preserveRoots: [root] } : {},
    );
    render.beforeRemove(root);
    ui.enhance(document);
    return async () => {
      if (mode === "render") root.remove();
      await render.commit();
    };
  }
  return undefined;
}

function formFixture() {
  const main = document.createElement("main");
  main.innerHTML =
    '<form id="owned-form" data-jqs="form"><div data-jqs="field"><input name="inside" required><p data-part="message" hidden></p></div></form><div data-jqs="field"><input name="outside" form="owned-form" required><p data-part="message" hidden></p></div>';
  document.body.append(main);
  const form = main.querySelector("form");
  const inside = main.querySelector<HTMLInputElement>('[name="inside"]');
  const outside = main.querySelector<HTMLInputElement>('[name="outside"]');
  if (!form || !inside || !outside) throw new Error("Missing Form fixture.");
  return { main, form, inside, outside };
}

it.each(modes)("Form owns internal and associated controls across %s", async (mode) => {
  const { form, inside, outside } = formFixture();
  ui.enhance(form);
  await star.whenEnhanced();
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:submit", submitted);
  const finish = await boundary(form, mode);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  inside.dispatchEvent(new Event("invalid"));
  outside.dispatchEvent(new Event("invalid"));
  expect(submitted).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
  expect(inside.hasAttribute("aria-invalid")).toBe(mode === "preserve");
  expect(outside.hasAttribute("aria-invalid")).toBe(mode === "preserve");
  await finish?.();
});

for (const event of ["reset", "invalid"] as const) {
  it.each(modes)(`Form invalidates a queued ${event} across %s`, async (mode) => {
    const { form, inside } = formFixture();
    ui.form.setErrors(form, { inside: "Server message" }, { focus: false });
    await star.whenEnhanced();
    const queued: VoidFunction[] = [];
    const queue = vi
      .spyOn(window, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));
    if (event === "reset") form.reset();
    else inside.dispatchEvent(new Event("invalid"));
    queue.mockRestore();
    expect(queued).toHaveLength(1);
    const emitted = vi.fn();
    form.addEventListener(`jquery-star:form:${event}`, emitted);
    const finish = await boundary(form, mode);
    const prior = form.outerHTML;
    for (const callback of queued) callback();
    expect(emitted).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
    if (mode !== "preserve") expect(form.outerHTML).toBe(prior);
    await finish?.();
  });
}

it("Form reacquires one listener set and ignores an older reset after reinsertion", async () => {
  const { main, form, inside } = formFixture();
  ui.enhance(form);
  await star.whenEnhanced();
  const queued: VoidFunction[] = [];
  const queue = vi
    .spyOn(window, "queueMicrotask")
    .mockImplementation((callback) => queued.push(callback));
  form.reset();
  queue.mockRestore();
  form.remove();
  await star.whenEnhanced();
  main.prepend(form);
  ui.enhance(form);
  ui.enhance(form);
  ui.form.setErrors(form, { inside: "Current error" }, { focus: false });
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:submit", submitted);
  for (const callback of queued) callback();
  expect(inside.validationMessage).toBe("Current error");
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  expect(submitted).toHaveBeenCalledOnce();
});

it("Form cancels native submission when before-submit disposes its owner", () => {
  const { form } = formFixture();
  ui.enhance(form);
  const submitted = vi.fn();
  form.addEventListener("jquery-star:form:before-submit", () => star.dispose());
  form.addEventListener("jquery-star:form:submit", submitted);
  const event = new Event("submit", { cancelable: true });
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(submitted).not.toHaveBeenCalled();
});

it.each(["invalid", "server-invalid"])("Form stops focus after disposal from %s", (phase) => {
  const { form, inside } = formFixture();
  ui.enhance(form);
  const focused = vi.spyOn(inside, "focus");
  if (phase === "invalid") {
    inside.addEventListener("invalid", () => star.dispose());
    expect(ui.form.validate(form)).toBe(false);
  } else {
    form.addEventListener("jquery-star:form:server-invalid", () => star.dispose());
    ui.form.setErrors(form, { inside: "Rejected" });
  }
  expect(focused).not.toHaveBeenCalled();
});

function pointer(target: EventTarget, type: string, x = 100, id = 7): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x });
  Object.defineProperty(event, "pointerId", { value: id });
  target.dispatchEvent(event);
}

function pointerListeners(): number[] {
  return pointerTypes.map((type) => {
    const listeners = new Set(
      added.mock.calls.filter(([name]) => name === type).map(([, listener]) => listener),
    );
    for (const [name, listener] of removed.mock.calls)
      if (name === type) listeners.delete(listener);
    return listeners.size;
  });
}

function resizableFixture() {
  const root = document.createElement("section");
  root.dataset.jqs = "resizable";
  root.dataset.value = "[50,50]";
  root.innerHTML =
    '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
  const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
  if (!handle) throw new Error("Missing Resizable handle.");
  handle.setPointerCapture = vi.fn();
  handle.releasePointerCapture = vi.fn();
  vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 100));
  document.body.append(root);
  return { root, handle };
}

it.each(modes)("Resizable owns native handle listeners across %s", async (mode) => {
  const { root, handle } = resizableFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  const finish = await boundary(root, mode);
  handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  expect(root.dataset.value).toBe(mode === "preserve" ? "[55,45]" : "[50,50]");
  pointer(handle, "pointerdown");
  expect(pointerListeners()).toEqual(mode === "preserve" ? [1, 1, 1] : [0, 0, 0]);
  pointer(window, "pointerup");
  await finish?.();
});

it.each(modes)("Resizable releases an active pointer session at %s", async (mode) => {
  const { root, handle } = resizableFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  pointer(handle, "pointerdown");
  expect(pointerListeners()).toEqual([1, 1, 1]);
  const finish = await boundary(root, mode);
  expect(pointerListeners()).toEqual(mode === "preserve" ? [1, 1, 1] : [0, 0, 0]);
  expect(handle.dataset.state).toBe(mode === "preserve" ? "dragging" : "idle");
  if (mode !== "preserve") expect(handle.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
  pointer(window, "pointermove", 150);
  expect(root.dataset.value).toBe(mode === "preserve" ? "[60,40]" : "[50,50]");
  pointer(window, "pointerup", 150);
  await finish?.();
});

it("Resizable reacquires one native listener set", async () => {
  const { root, handle } = resizableFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const changed = vi.fn();
  root.addEventListener("jquery-star:resizable:change", changed);
  handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  expect(root.dataset.value).toBe("[55,45]");
  expect(changed).toHaveBeenCalledOnce();
});

it("Resizable stops a before-change continuation after disposal", () => {
  const { root } = resizableFixture();
  ui.enhance(root);
  const changed = vi.fn();
  root.addEventListener("jquery-star:resizable:before-change", () => star.dispose());
  root.addEventListener("jquery-star:resizable:change", changed);
  ui.resizable.set(root, [30, 70]);
  expect(root.dataset.value).toBe("[50,50]");
  expect(changed).not.toHaveBeenCalled();
});

it.each(["setPointerCapture", "releasePointerCapture", "resize-start"] as const)(
  "Resizable stops pointer work after disposal from %s",
  (phase) => {
    const { root, handle } = resizableFixture();
    ui.enhance(root);
    const ended = vi.fn();
    root.addEventListener("jquery-star:resizable:resize-end", ended);
    if (phase === "resize-start")
      root.addEventListener("jquery-star:resizable:resize-start", () => star.dispose());
    else handle[phase] = vi.fn(() => star.dispose());
    pointer(handle, "pointerdown");
    if (phase === "releasePointerCapture") pointer(window, "pointerup");
    expect(pointerListeners()).toEqual([0, 0, 0]);
    expect(handle.dataset.state).toBe("idle");
    expect(ended).not.toHaveBeenCalled();
  },
);

it("Resizable rolls back pointer listeners when native capture throws", () => {
  const { root, handle } = resizableFixture();
  ui.enhance(root);
  const error = new Error("capture failed");
  const reported = vi.fn();
  const onError = (event: ErrorEvent): void => {
    reported(event.error);
    event.preventDefault();
  };
  window.addEventListener("error", onError);
  handle.setPointerCapture = () => {
    throw error;
  };
  try {
    pointer(handle, "pointerdown");
    expect(reported).toHaveBeenCalledExactlyOnceWith(error);
    expect(pointerListeners()).toEqual([0, 0, 0]);
    expect(handle.dataset.state).toBe("idle");
  } finally {
    window.removeEventListener("error", onError);
  }
});

it("Resizable rolls back pointer registration interrupted by disposal", () => {
  const { root, handle } = resizableFixture();
  ui.enhance(root);
  added.mockImplementation((type, listener, options) => {
    register(type, listener, options);
    if (type === "pointermove") star.dispose();
  });
  pointer(handle, "pointerdown");
  expect(pointerListeners()).toEqual([0, 0, 0]);
  expect(handle.setPointerCapture).not.toHaveBeenCalled();
});

it("Resizable releases pointer sessions in their original documents", async () => {
  const frames: HTMLIFrameElement[] = [];
  const owners: Array<{ star: typeof star; listeners(): number[]; handle: HTMLElement }> = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      frames.push(frame);
      const owner = frame.contentWindow;
      if (!owner) throw new Error("Missing pointer owner window.");
      const jquery = jQueryFactory(owner);
      const on = vi.spyOn(owner, "addEventListener");
      const off = vi.spyOn(owner, "removeEventListener");
      const listeners = () =>
        pointerTypes.map((type) => {
          const active = new Set(
            on.mock.calls.filter(([name]) => name === type).map(([, listener]) => listener),
          );
          for (const [name, listener] of off.mock.calls) if (name === type) active.delete(listener);
          return active.size;
        });
      await withStarDOMRealm(
        { window: owner as Window & typeof globalThis, jQuery: jquery },
        async () => {
          const installed = installStarCore(jquery, { document: owner.document });
          const other = installed.star.use(uiPlugin);
          const { root, handle } = resizableFixture();
          owners.push({ star: installed.star, listeners, handle });
          other.enhance(root);
          pointer(handle, "pointerdown");
          await installed.star.whenEnhanced();
        },
      );
    }
    const [first, second] = owners;
    if (!first || !second) throw new Error("Missing pointer owners.");
    expect(first.listeners()).toEqual([1, 1, 1]);
    expect(second.listeners()).toEqual([1, 1, 1]);
    first.star.dispose();
    expect(first.listeners()).toEqual([0, 0, 0]);
    expect(first.handle.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(second.listeners()).toEqual([1, 1, 1]);
    second.star.dispose();
    expect(second.listeners()).toEqual([0, 0, 0]);
  } finally {
    for (const owner of owners) owner.star.dispose();
    for (const frame of frames) frame.remove();
  }
});

function entryFixture(kind: "input-otp" | "tags-input") {
  const root = document.createElement("section");
  root.dataset.jqs = kind;
  root.innerHTML = '<input data-part="control"><p data-part="status"></p>';
  const control = root.querySelector("input");
  if (!control) throw new Error("Missing entry control.");
  document.body.append(root);
  return { root, control };
}

for (const kind of ["input-otp", "tags-input"] as const) {
  const enter = (control: HTMLInputElement) => {
    control.value = "123456";
    if (kind === "input-otp") control.dispatchEvent(new Event("input", { bubbles: true }));
    else key(control, "Enter");
  };
  it.each(modes)(`${kind} owns native entry across %s`, async (mode) => {
    const { root, control } = entryFixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    const finish = await boundary(root, mode);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    enter(control);
    expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
    await finish?.();
  });

  it(`${kind} reacquires one native entry handler`, async () => {
    const { root, control } = entryFixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    document.body.append(root);
    ui.enhance(root);
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    enter(control);
    expect(changed).toHaveBeenCalledOnce();
  });

  it.each(["before-change", "component-change", "input", "change"])(
    `${kind} stops continuation after disposal from %s`,
    (phase) => {
      const { root } = entryFixture(kind);
      ui.enhance(root);
      let atDisposal = "";
      const type =
        phase === "component-change"
          ? `jquery-star:${kind}:change`
          : phase === "before-change"
            ? `jquery-star:${kind}:before-change`
            : phase;
      root.addEventListener(type, () => {
        star.dispose();
        atDisposal = root.innerHTML;
      });
      const complete = vi.fn();
      root.addEventListener(`jquery-star:${kind}:complete`, complete);
      if (kind === "input-otp") ui.inputOTP.set(root, "123456");
      else ui.tagsInput.add(root, "123456");
      expect(root.innerHTML).toBe(atDisposal);
      expect(complete).not.toHaveBeenCalled();
    },
  );
}

function uploadFixture() {
  const form = document.createElement("form");
  form.innerHTML =
    '<section data-jqs="file-upload"><input data-part="control" type="file" multiple><ul data-part="list"></ul><p data-part="status"></p></section>';
  document.body.append(form);
  const root = form.querySelector("section");
  const control = form.querySelector("input");
  if (!root || !control) throw new Error("Missing upload fixture.");
  return { form, root, control };
}

function selectFile(control: HTMLInputElement, name: string): void {
  Object.defineProperty(control, "files", { configurable: true, value: [new File([name], name)] });
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

it.each(modes)("File Upload retires listeners and queued reset at %s", async (mode) => {
  const { form, root, control } = uploadFixture();
  ui.enhance(root);
  selectFile(control, "old.txt");
  await star.whenEnhanced();
  const queued: VoidFunction[] = [];
  const queue = vi
    .spyOn(window, "queueMicrotask")
    .mockImplementation((callback) => queued.push(callback));
  form.reset();
  queue.mockRestore();
  const finish = await boundary(root, mode);
  const prior = root.innerHTML;
  Object.defineProperty(control, "files", { configurable: true, value: [] });
  for (const callback of queued) callback();
  if (mode === "preserve") expect(root.dataset.count).toBe("0");
  else expect(root.innerHTML).toBe(prior);
  const changed = vi.fn();
  root.addEventListener("jquery-star:file-upload:change", changed);
  selectFile(control, "new.txt");
  expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
  await finish?.();
});

it("File Upload reacquires listeners and preserves a current reset through enhancement", async () => {
  const { form, root, control } = uploadFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  form.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const changed = vi.fn();
  root.addEventListener("jquery-star:file-upload:change", changed);
  selectFile(control, "new.txt");
  expect(changed).toHaveBeenCalledOnce();
  form.reset();
  Object.defineProperty(control, "files", { configurable: true, value: [] });
  ui.enhance(root);
  await Promise.resolve();
  expect(root.dataset.count).toBe("0");
});

it.each(["before-change", "reject", "change"])(
  "File Upload stops after disposal from %s",
  (phase) => {
    const { root, control } = uploadFixture();
    ui.enhance(root);
    if (phase === "reject") control.accept = ".png";
    let atDisposal = "";
    root.addEventListener(`jquery-star:file-upload:${phase}`, () => {
      star.dispose();
      atDisposal = root.innerHTML;
    });
    const input = vi.fn();
    root.addEventListener("input", input);
    selectFile(control, "new.txt");
    expect(root.innerHTML).toBe(atDisposal);
    expect(input).not.toHaveBeenCalled();
  },
);

function sortableFixture() {
  const root = document.createElement("section");
  root.dataset.jqs = "sortable";
  root.dataset.name = "order";
  root.innerHTML =
    '<ul data-part="list"><li data-part="item" data-value="a"><button data-part="handle">A</button><button data-part="down">Down</button></li><li data-part="item" data-value="b"><button data-part="handle">B</button></li></ul><p data-part="status"></p>';
  document.body.append(root);
  const handle = root.querySelector<HTMLButtonElement>('[data-part="handle"]');
  const down = root.querySelector<HTMLButtonElement>('[data-part="down"]');
  if (!handle || !down) throw new Error("Missing sortable fixture.");
  return { root, handle, down };
}

function key(handle: HTMLElement, key: string): void {
  handle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

it.each(modes)("Sortable cancels preview and listeners at %s", async (mode) => {
  const { root, handle, down } = sortableFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  key(handle, " ");
  key(handle, "ArrowDown");
  const finish = await boundary(root, mode);
  const values = () =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]')).map(
      (item) => item.dataset.value,
    );
  expect(values()).toEqual(mode === "preserve" ? ["b", "a"] : ["a", "b"]);
  expect(root.dataset.state).toBe(mode === "preserve" ? "sorting" : "idle");
  if (mode !== "preserve") {
    down.click();
    key(handle, " ");
    expect(values()).toEqual(["a", "b"]);
    expect(root.dataset.state).toBe("idle");
  }
  await finish?.();
});

it("Sortable reacquires a single native listener set", async () => {
  const { root, down } = sortableFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const changed = vi.fn();
  root.addEventListener("jquery-star:sortable:change", changed);
  down.click();
  expect(root.dataset.value).toBe('["b","a"]');
  expect(changed).toHaveBeenCalledOnce();
});

it.each(["grab", "before-change", "change", "drop", "cancel"])(
  "Sortable stops after disposal from %s",
  (phase) => {
    const { root, handle } = sortableFixture();
    ui.enhance(root);
    let atDisposal = "";
    root.addEventListener(`jquery-star:sortable:${phase}`, () => {
      star.dispose();
      atDisposal = root.innerHTML;
    });
    const input = vi.fn();
    root.addEventListener("input", input);
    key(handle, " ");
    if (phase !== "grab") {
      key(handle, "ArrowDown");
      key(handle, phase === "cancel" ? "Escape" : " ");
    }
    expect(root.innerHTML).toBe(atDisposal);
    if (["grab", "before-change", "change", "cancel"].includes(phase))
      expect(input).not.toHaveBeenCalled();
  },
);

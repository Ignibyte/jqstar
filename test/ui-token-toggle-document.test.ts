import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
const failedDisposals = new Set<ReturnType<typeof installStarCore>["star"]>();
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { jquery, star, ui: star.use(uiPlugin), owner };
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  if (!frame.contentWindow) throw new Error("Missing frame");
  return frame.contentWindow;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) {
    if (failedDisposals.delete(star)) expect(() => star.dispose()).toThrow();
    else star.dispose();
  }
  document.body.replaceChildren();
  vi.useRealTimers();
});
type Kind = "input-otp" | "tags-input" | "toggle" | "toggle-group";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window) {
  const root = owner.document.createElement(kind === "toggle" ? "button" : "section");
  root.dataset.jqs = kind;
  root.id = "sample";
  if (kind === "input-otp") {
    root.dataset.length = "4";
    root.innerHTML =
      '<input data-part="control" value="1"><div data-part="slots"></div><span data-part="status"></span>';
  } else if (kind === "tags-input") {
    root.dataset.value = '["a"]';
    root.dataset.name = "tags";
    root.innerHTML =
      '<input data-part="control" value="Draft"><ul data-part="list"></ul><span data-part="status"></span>';
  } else if (kind === "toggle") root.textContent = "Toggle";
  else {
    root.dataset.value = "a";
    root.dataset.name = "choice";
    root.innerHTML =
      '<button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button><button data-part="item" data-value="c">C</button>';
  }
  owner.document.body.append(root);
  return root;
}
function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function control(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector('input[data-part="control"]');
  if (!input) throw new Error("Missing input");
  return input as HTMLInputElement;
}

function read(ui: UI, kind: Kind, target: HTMLElement | string) {
  if (kind === "input-otp") return ui.inputOTP.value(target);
  if (kind === "tags-input") return ui.tagsInput.value(target);
  if (kind === "toggle") return ui.toggle.pressed(target as HTMLButtonElement | string);
  return ui.toggleGroup.value(target);
}
function set(ui: UI, kind: Kind, root: HTMLElement, newer = false) {
  if (kind === "input-otp") ui.inputOTP.set(root, newer ? "9876" : "1234");
  else if (kind === "tags-input") ui.tagsInput.add(root, newer ? "c" : "b");
  else if (kind === "toggle") ui.toggle.press(root as HTMLButtonElement, !newer);
  else ui.toggleGroup.select(root, newer ? "c" : "b");
}
function expected(kind: Kind, newer = false) {
  return kind === "input-otp"
    ? newer
      ? "9876"
      : "1234"
    : kind === "tags-input"
      ? ["a", newer ? "c" : "b"]
      : kind === "toggle"
        ? !newer
        : newer
          ? "c"
          : "b";
}
function native(kind: Kind, root: HTMLElement, owner: Window = window) {
  if (kind === "input-otp") {
    const input = control(root);
    input.value = "1234";
    input.dispatchEvent(
      new (owner as Window & typeof globalThis).Event("input", { bubbles: true }),
    );
  } else if (kind === "tags-input") {
    const input = control(root);
    input.value = "b";
    input.dispatchEvent(
      new (owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        bubbles: true,
        key: "Enter",
      }),
    );
  } else if (kind === "toggle") root.click();
  else root.querySelector<HTMLButtonElement>('[data-value="b"]')?.click();
}
function state(kind: Kind, root: HTMLElement) {
  return kind === "toggle" ? root.getAttribute("aria-pressed") : root.dataset.value;
}
function bindingTarget(kind: Kind, root: HTMLElement): HTMLElement {
  return kind === "input-otp" || kind === "tags-input" ? part(root, "control") : root;
}

describe.each(["input-otp", "tags-input", "toggle", "toggle-group"] as const)(
  "%s document lifetime",
  (kind) => {
    it.each(["element", "selector"] as const)("accepts its foreign %s target", (mode) => {
      const { owner, ui } = install(realm());
      const root = fixture(kind, owner);
      ui.enhance(root);
      set(ui, kind, root);
      expect(read(ui, kind, mode === "element" ? root : "#sample")).toEqual(expected(kind));
    });
    it("automatically enhances a foreign document", async () => {
      const { owner, ui, star } = install(realm());
      await star.whenEnhanced();
      const root = fixture(kind, owner);
      await star.whenEnhanced();
      expect(root.dataset.state ?? root.getAttribute("role")).toBeTruthy();
      native(kind, root, owner);
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it.each(["enhance", "facade"] as const)(
      "reacquires adoption through %s and survives source disposal",
      (mode) => {
        const source = install();
        const destination = install(realm());
        const root = fixture(kind);
        source.ui.enhance(root);
        destination.owner.document.body.append(destination.owner.document.adoptNode(root));
        expect(() => read(source.ui, kind, root)).toThrow("unavailable");
        if (mode === "enhance") destination.ui.enhance(root);
        else read(destination.ui, kind, root);
        source.star.dispose();
        native(kind, root, destination.owner);
        expect(read(destination.ui, kind, root)).toEqual(expected(kind));
      },
    );
    it("emits component and synthesized native events in the destination window", () => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      const events: Event[] = [];
      const inputs: Event[] = [];
      root.addEventListener(`jquery-star:${kind}:change`, (event) => events.push(event));
      root.addEventListener("input", (event) => inputs.push(event));
      set(destination.ui, kind, root);
      const owner = destination.owner as Window & typeof globalThis;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(owner.CustomEvent);
      expect(inputs).toHaveLength(kind === "input-otp" || kind === "tags-input" ? 1 : 0);
      expect(inputs.every((event) => event instanceof owner.Event)).toBe(true);
    });
    it("runs a private action in a foreign installation", () => {
      const { owner, jquery, ui } = install(realm());
      const root = fixture(kind, owner);
      const button = kind === "toggle" ? root : owner.document.createElement("button");
      const expression =
        kind === "input-otp"
          ? "@ui.input-otp.set('1234')"
          : kind === "tags-input"
            ? "@ui.tags-input.add('b')"
            : kind === "toggle"
              ? "@ui.toggle.press(true)"
              : "@ui.toggle-group.select('b')";
      button.setAttribute("data-on:click", expression);
      if (button !== root) root.append(button);
      jquery(root).star();
      button.click();
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it("retains exact bindings and generated nodes during unchanged enhancement", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      const target = bindingTarget(kind, root);
      const add = vi.spyOn(target, "addEventListener");
      const remove = vi.spyOn(target, "removeEventListener");
      const children = [
        ...root.querySelectorAll('[data-part="slot"], [data-part="tag"], input[data-generated]'),
      ];
      ui.enhance(root);
      ui.enhance(root);
      expect(add).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect([
        ...root.querySelectorAll('[data-part="slot"], [data-part="tag"], input[data-generated]'),
      ]).toEqual(children);
      native(kind, root);
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it("preserves a newer request made during before-change", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      root.addEventListener(`jquery-star:${kind}:before-change`, () => set(ui, kind, root, true), {
        once: true,
      });
      set(ui, kind, root);
      expect(read(ui, kind, root)).toEqual(expected(kind, true));
    });
    it.each(["adopt", "replace"] as const)("stops before-change continuation after %s", (mode) => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      const before = state(kind, root);
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      root.addEventListener(
        `jquery-star:${kind}:before-change`,
        () => {
          if (mode === "adopt")
            destination.owner.document.body.append(destination.owner.document.adoptNode(root));
          else if (kind === "toggle") (root as HTMLButtonElement).disabled = true;
          else {
            const original = part(root, kind === "toggle-group" ? "item" : "control");
            original.replaceWith(original.cloneNode(true));
          }
        },
        { once: true },
      );
      set(source.ui, kind, root);
      expect(state(kind, root)).toBe(before);
      expect(changed).not.toHaveBeenCalled();
    });
    it("releases a native listener registered before setup throws", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const target = bindingTarget(kind, root);
      const add = target.addEventListener.bind(target);
      const remove = vi.spyOn(target, "removeEventListener");
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("native setup failed");
      });
      expect(() => ui.enhance(root)).toThrow("native setup failed");
      expect(remove).toHaveBeenCalled();
      vi.restoreAllMocks();
      star.dispose();
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      native(kind, root);
      expect(changed).not.toHaveBeenCalled();
    });
    it("removes a native listener returned after disposal", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const target = bindingTarget(kind, root);
      const add = target.addEventListener.bind(target);
      const remove = vi.spyOn(target, "removeEventListener");
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        star.dispose();
        add(...args);
      });
      try {
        ui.enhance(root);
      } catch {
        /* Disposed setup can reject. */
      }
      expect(remove).toHaveBeenCalled();
    });
  },
);

it.each(["input-otp", "tags-input"] as const)(
  "%s stops stale native notifications after newer work",
  (kind) => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const changes: unknown[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      changes.push((event as CustomEvent).detail),
    );
    root.addEventListener("input", () => set(ui, kind, root, true), { once: true });
    set(ui, kind, root);
    expect(changes).toHaveLength(1);
    expect(read(ui, kind, root)).toEqual(kind === "tags-input" ? ["a", "b", "c"] : "9876");
  },
);
it("Input OTP stops completion and status after change starts an incomplete value", () => {
  const { ui } = install();
  const root = fixture("input-otp");
  ui.enhance(root);
  const complete = vi.fn();
  root.addEventListener("jquery-star:input-otp:complete", complete);
  root.addEventListener("jquery-star:input-otp:change", () => ui.inputOTP.set(root, "9"), {
    once: true,
  });
  ui.inputOTP.set(root, "1234");
  expect(ui.inputOTP.value(root)).toBe("9");
  expect(complete).not.toHaveBeenCalled();
  expect(part(root, "status").textContent).toBe("");
});
it("Input OTP preserves silent native value and selection through adoption", () => {
  const source = install();
  const destination = install(realm());
  const root = fixture("input-otp");
  source.ui.enhance(root);
  const input = control(root);
  input.value = "23";
  input.setSelectionRange(1, 1);
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  destination.ui.enhance(root);
  expect(destination.ui.inputOTP.value(root)).toBe("23");
  expect(input.selectionStart).toBe(1);
});
it("Tags Input preserves composition and draft selection through adoption", () => {
  const source = install();
  const destination = install(realm());
  const root = fixture("tags-input");
  source.ui.enhance(root);
  const input = control(root);
  input.value = "Draft";
  input.setSelectionRange(1, 3);
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  destination.ui.enhance(root);
  input.dispatchEvent(
    new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      isComposing: true,
    }),
  );
  expect(input.value).toBe("Draft");
  expect(input.selectionStart).toBe(1);
  expect(input.selectionEnd).toBe(3);
  expect(destination.ui.tagsInput.value(root)).toEqual(["a"]);
});
it("Tags Input does not erase a newer draft or status after change", () => {
  const { ui } = install();
  const root = fixture("tags-input");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:tags-input:change",
    () => {
      ui.tagsInput.add(root, "c");
      control(root).value = "new draft";
    },
    { once: true },
  );
  ui.tagsInput.add(root, "b");
  expect(control(root).value).toBe("new draft");
  expect(part(root, "status").textContent).toBe("c added.");
});
it("Toggle Group preserves roving focus through unchanged enhancement", () => {
  const { ui } = install();
  const root = fixture("toggle-group");
  ui.enhance(root);
  const next = root.querySelector<HTMLButtonElement>('[data-value="b"]');
  if (!next) throw new Error("Missing item");
  next.focus();
  ui.enhance(root);
  expect(next.tabIndex).toBe(0);
  expect(document.activeElement).toBe(next);
  expect(part(root, "item").tabIndex).toBe(-1);
});
it("Input OTP reflects an uncanceled native form reset without change events", () => {
  vi.useFakeTimers();
  const { ui } = install();
  const root = fixture("input-otp");
  const form = document.createElement("form");
  root.before(form);
  form.append(root);
  ui.enhance(root);
  ui.inputOTP.set(root, "1234");
  const changed = vi.fn();
  root.addEventListener("jquery-star:input-otp:change", changed);
  form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
  form.reset();
  vi.runOnlyPendingTimers();
  expect(ui.inputOTP.value(root)).toBe("1234");
  form.reset();
  ui.enhance(root);
  vi.runOnlyPendingTimers();
  expect(ui.inputOTP.value(root)).toBe("1");
  expect(part(root, "slots").textContent).toBe("1");
  expect(changed).not.toHaveBeenCalled();
});

it.each(["input-otp", "tags-input", "toggle", "toggle-group"] as const)(
  "%s keeps destination ownership acquired during old listener cleanup",
  (kind) => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    source.ui.enhance(root);
    const target = bindingTarget(kind, root);
    const remove = target.removeEventListener.bind(target);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    vi.spyOn(target, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.ui.enhance(root);
    source.star.dispose();
    native(kind, root, destination.owner);
    expect(read(destination.ui, kind, root)).toEqual(expected(kind));
  },
);
it.each(["input-otp", "tags-input", "toggle", "toggle-group"] as const)(
  "%s finishes resource retirement after native cleanup fails",
  (kind) => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const target = bindingTarget(kind, root);
    const remove = target.removeEventListener.bind(target);
    const spy = vi.spyOn(target, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("native cleanup failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    if (kind !== "toggle") expect(spy.mock.calls.length).toBeGreaterThan(1);
    vi.restoreAllMocks();
    const before = state(kind, root);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    native(kind, root);
    expect(state(kind, root)).toBe(before);
    expect(changed).not.toHaveBeenCalled();
  },
);
it("Input OTP retires queued source resets and synchronizes the destination form", () => {
  vi.useFakeTimers();
  const source = install();
  const destination = install(realm());
  const root = fixture("input-otp");
  const form = document.createElement("form");
  root.before(form);
  form.append(root);
  source.ui.enhance(root);
  source.ui.inputOTP.set(root, "1234");
  form.reset();
  destination.owner.document.body.append(destination.owner.document.adoptNode(form));
  destination.ui.enhance(root);
  source.star.dispose();
  destination.ui.inputOTP.set(root, "9876");
  vi.runOnlyPendingTimers();
  expect(destination.ui.inputOTP.value(root)).toBe("9876");
  form.reset();
  destination.ui.enhance(root);
  vi.runOnlyPendingTimers();
  expect(destination.ui.inputOTP.value(root)).toBe("1");
});
it("Input OTP cancels a reset handle returned after disposal", () => {
  vi.useFakeTimers();
  const { ui, star } = install();
  const root = fixture("input-otp");
  const form = document.createElement("form");
  root.before(form);
  form.append(root);
  ui.enhance(root);
  const scheduler: Window = window;
  const schedule = scheduler.setTimeout.bind(scheduler);
  const cancel = vi.spyOn(scheduler, "clearTimeout");
  let handle: number | undefined;
  vi.spyOn(scheduler, "setTimeout").mockImplementation((...args) => {
    star.dispose();
    handle = schedule(...args);
    return handle;
  });
  form.reset();
  expect(handle).toBeDefined();
  expect(cancel).toHaveBeenCalledWith(handle);
});
it("Input OTP stops before-change work superseded by normalization constraints", () => {
  const { ui } = install();
  const root = fixture("input-otp");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:input-otp:before-change",
    () => {
      root.dataset.length = "2";
    },
    { once: true },
  );
  ui.inputOTP.set(root, "1234");
  expect(control(root).value).toBe("1");
});
it("Tags Input stops an addition superseded by a lower limit", () => {
  const { ui } = install();
  const root = fixture("tags-input");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:tags-input:before-change",
    () => {
      root.dataset.max = "1";
    },
    { once: true },
  );
  ui.tagsInput.add(root, "b");
  expect(ui.tagsInput.value(root)).toEqual(["a"]);
  expect(control(root).value).toBe("Draft");
});
it("Tags Input uses native list items and owning-document generated form values", () => {
  const { owner, ui } = install(realm());
  const root = fixture("tags-input", owner);
  const list = owner.document.createElement("ol");
  list.dataset.part = "list";
  part(root, "list").replaceWith(list);
  ui.enhance(root);
  ui.tagsInput.add(root, "b");
  expect([...list.children].map((node) => node.localName)).toEqual(["li", "li"]);
  const generated = [...root.querySelectorAll('input[data-generated="tags-input"]')];
  expect(generated.map((node) => node.ownerDocument)).toEqual([owner.document, owner.document]);
});
it("Toggle Group honors an explicitly empty patched value and keeps stable generated inputs", () => {
  const { ui } = install();
  const root = fixture("toggle-group");
  ui.enhance(root);
  const inputs = [...root.querySelectorAll("input")];
  ui.enhance(root);
  expect([...root.querySelectorAll("input")]).toEqual(inputs);
  root.dataset.value = "";
  ui.enhance(root);
  expect(ui.toggleGroup.value(root)).toBeUndefined();
  expect(root.querySelectorAll("input")).toHaveLength(0);
});
it("Toggle Group stops deselection when before-change adds the required constraint", () => {
  const { ui } = install();
  const root = fixture("toggle-group");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:toggle-group:before-change",
    () => root.setAttribute("data-required", ""),
    { once: true },
  );
  ui.toggleGroup.select(root, "a", false);
  expect(ui.toggleGroup.value(root)).toBe("a");
});

it.each(["enhance", "focus"] as const)(
  "Input OTP retains completion while an input callback requests unchanged %s",
  (mode) => {
    const { ui } = install();
    const root = fixture("input-otp");
    ui.enhance(root);
    const completed = vi.fn();
    root.addEventListener("jquery-star:input-otp:complete", completed);
    root.addEventListener(
      "input",
      () => {
        if (mode === "enhance") ui.enhance(root);
        else ui.inputOTP.focus(root);
      },
      { once: true },
    );
    ui.inputOTP.set(root, "1234");
    expect(completed).toHaveBeenCalledOnce();
    expect(part(root, "status").textContent).toBe("Code complete.");
  },
);

it("Toggle Group releases provisional listeners when generating form fields fails", () => {
  const { ui, star } = install();
  const root = fixture("toggle-group");
  const append = root.append.bind(root);
  const remove = vi.spyOn(root, "removeEventListener");
  vi.spyOn(root, "append").mockImplementationOnce((...nodes) => {
    append(...nodes);
    throw new Error("form field append failed");
  });
  expect(() => ui.enhance(root)).toThrow("form field append failed");
  expect(remove.mock.calls.length).toBe(3);
  vi.restoreAllMocks();
  star.dispose();
  const before = root.dataset.value;
  native("toggle-group", root);
  expect(root.dataset.value).toBe(before);
});

it.each(["tags-input", "toggle-group"] as const)(
  "%s keeps current generated form values during a native reset",
  (kind) => {
    const { ui } = install();
    const root = fixture(kind);
    const form = document.createElement("form");
    root.before(form);
    form.append(root);
    ui.enhance(root);
    set(ui, kind, root);
    if (kind === "tags-input") control(root).value = "temporary draft";
    form.reset();
    ui.enhance(root);
    expect(read(ui, kind, root)).toEqual(expected(kind));
    expect(new FormData(form).getAll(kind === "tags-input" ? "tags" : "choice")).toEqual(
      kind === "tags-input" ? ["a", "b"] : ["b"],
    );
    if (kind === "tags-input") expect(control(root).value).toBe("Draft");
  },
);

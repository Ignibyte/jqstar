import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import type { StarUIStatic } from "../src/types";
type Owner = Window & typeof globalThis;
function required<T>(value: T | undefined | null): T {
  if (value == null) throw new Error("Missing document ownership fixture");
  return value;
}
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function setup(foreign = false) {
  const frame = document.createElement("iframe");
  if (foreign) document.body.append(frame);
  const owner = foreign ? (required(frame.contentWindow) as Owner) : required(document.defaultView);
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  stars.push(jquery.star);
  return { owner, jquery, star: jquery.star, ui: jquery.star.use(uiPlugin) };
}
function dispatch(
  owner: Owner,
  target: EventTarget,
  type: string,
  options: MouseEventInit & KeyboardEventInit = {},
) {
  const Ctor = type === "keydown" ? owner.KeyboardEvent : owner.MouseEvent;
  const event = new Ctor(type, { bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

function resizable(owner: Owner = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = "resizable";
  root.dataset.value = "[50,50]";
  root.innerHTML =
    '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
  return {
    root,
    handle: required(root.querySelector<HTMLElement>('[data-part="handle"]')),
    first: required(root.querySelector<HTMLElement>('[data-part="panel"]')),
  };
}
function sortable(owner: Owner = window) {
  const form = owner.document.createElement("form");
  const root = owner.document.createElement("section");
  root.dataset.jqs = "sortable";
  root.dataset.name = "order";
  root.innerHTML =
    '<ol data-part="list">' +
    ["a", "b", "c"]
      .map(
        (v) =>
          `<li data-part="item" data-value="${v}"><button data-part="handle">Move ${v}</button><button data-part="down">Down</button></li>`,
      )
      .join("") +
    '</ol><p data-part="status"></p>';
  form.append(root);
  return {
    form,
    root,
    list: required(root.querySelector("ol")),
    down: required(root.querySelector<HTMLButtonElement>('[data-part="down"]')),
    handle: required(root.querySelector<HTMLButtonElement>('[data-part="handle"]')),
  };
}
describe.each([false, true])("Resizable foreign=%s", (foreign) => {
  it("uses owning-document native elements and event constructors", () => {
    const { ui, owner } = setup(foreign);
    const { root } = resizable(owner);
    const events: Event[] = [];
    root.addEventListener("jquery-star:resizable:change", (e) => events.push(e));
    ui.resizable.set(root, [25, 75]);
    expect(ui.resizable.value(root)).toEqual([25, 75]);
    expect(events[0]).toBeInstanceOf(owner.CustomEvent);
  });
  it("keeps a newer before-change request", () => {
    const { ui, owner } = setup(foreign);
    const { root } = resizable(owner);
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:resizable:before-change",
      () => ui.resizable.set(root, [70, 30]),
      { once: true },
    );
    ui.resizable.set(root, [25, 75]);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
  });
  it("honors canceled native keyboard movement", () => {
    const { ui, owner } = setup(foreign);
    const { root, handle } = resizable(owner);
    handle.addEventListener("keydown", (e) => e.preventDefault());
    ui.enhance(root);
    dispatch(owner, handle, "keydown", { key: "ArrowRight" });
    expect(ui.resizable.value(root)).toEqual([50, 50]);
  });
  it("reads patched source through the value facade", () => {
    const { ui, owner } = setup(foreign);
    const { root } = resizable(owner);
    ui.enhance(root);
    root.dataset.value = "[20,80]";
    expect(ui.resizable.value(root)).toEqual([20, 80]);
  });
  it("ignores a replaced native handle before enhancement", () => {
    const { ui, owner } = setup(foreign);
    const { root, handle } = resizable(owner);
    ui.enhance(root);
    handle.replaceWith(handle.cloneNode(true));
    dispatch(owner, handle, "keydown", { key: "ArrowRight" });
    expect(ui.resizable.value(root)).toEqual([50, 50]);
  });
  it("does not expose the accepted size array to event detail mutation", () => {
    const { ui, owner } = setup(foreign);
    const { root } = resizable(owner);
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:resizable:before-change",
      (e) => (e as CustomEvent<{ sizes: number[] }>).detail.sizes.splice(0, 2, 1, 1),
      { once: true },
    );
    ui.resizable.set(root, [25, 75]);
    expect(ui.resizable.value(root)).toEqual([25, 75]);
  });
  it("stops change notification after a callback replaces a panel", () => {
    const { ui, owner } = setup(foreign);
    const { root, first } = resizable(owner);
    ui.enhance(root);
    const change = vi.fn();
    root.addEventListener("jquery-star:resizable:change", change);
    root.addEventListener(
      "jquery-star:resizable:before-change",
      () => first.replaceWith(first.cloneNode(true)),
      { once: true },
    );
    ui.resizable.set(root, [25, 75]);
    expect(change).not.toHaveBeenCalled();
  });
  it("keeps a newer request started by the input iterator", () => {
    const { ui, owner } = setup(foreign);
    const { root } = resizable(owner);
    ui.enhance(root);
    const sizes = [25, 75];
    sizes[Symbol.iterator] = function* () {
      ui.resizable.set(root, [70, 30]);
      yield 25;
      yield 75;
      return undefined;
    };
    ui.resizable.set(root, sizes);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
  });
});
function describeOwnerCases(kind: "resizable" | "sortable"): void {
  describe.each([false, true])(`${kind} expanded foreign=%s`, (foreign) => {
    function fixture() {
      const installed = setup(foreign);
      const parts = kind === "resizable" ? resizable(installed.owner) : sortable(installed.owner);
      installed.owner.document.body.append("form" in parts ? parts.form : parts.root);
      const root = parts.root;
      root.id = "expanded-target";
      root.className = "expanded-target";
      return { ...installed, ...parts, root };
    }
    const expected = kind === "resizable" ? [25, 75] : ["b", "a", "c"];
    const initial = kind === "resizable" ? [50, 50] : ["a", "b", "c"];
    function change(ui: StarUIStatic, root: HTMLElement) {
      if (kind === "resizable") ui.resizable.set(root, [25, 75]);
      else ui.sortable.move(root, "a", 1);
    }
    it.each(["implicit", "id", "class", "element"])(
      "resolves %s actions at the application root",
      async (mode) => {
        const { jquery, ui, root } = fixture();
        ui.enhance(root);
        const instance = required(jquery(root).star().star("instance"));
        const target =
          mode === "id" ? "#expanded-target" : mode === "class" ? ".expanded-target" : root;
        const values = kind === "resizable" ? [[25, 75]] : ["a", 1];
        await instance.run(kind === "resizable" ? "ui.resizable.set" : "ui.sortable.move", {
          args: mode === "implicit" ? values : [target, ...values],
        });
        expect(ui[kind].value(root)).toEqual(expected);
      },
    );
    it.each(["native", "jquery"])("honors canceled %s named requests", async (eventKind) => {
      const { jquery, ui, root, owner } = fixture();
      ui.enhance(root);
      const instance = required(jquery(owner.document.body).star().star("instance"));
      const event =
        eventKind === "native"
          ? new owner.MouseEvent("click", { cancelable: true })
          : jquery.Event("click");
      event.preventDefault();
      await instance.run(kind === "resizable" ? "ui.resizable.set" : "ui.sortable.move", {
        args: kind === "resizable" ? ["#expanded-target", [25, 75]] : ["#expanded-target", "a", 1],
        event,
      });
      expect(ui[kind].value(root)).toEqual(initial);
    });
    it("stops after a before-change callback patches source state", () => {
      const { ui, root } = fixture();
      ui.enhance(root);
      const patched = kind === "resizable" ? [70, 30] : ["c", "a", "b"];
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      root.addEventListener(
        `jquery-star:${kind}:before-change`,
        () => (root.dataset.value = JSON.stringify(patched)),
        { once: true },
      );
      change(ui, root);
      expect(root.dataset.value).toBe(JSON.stringify(patched));
      expect(changed).not.toHaveBeenCalled();
    });
    it("retains a pending change through unchanged value inspection", () => {
      const { ui, root } = fixture();
      ui.enhance(root);
      root.addEventListener(
        `jquery-star:${kind}:before-change`,
        () => expect(ui[kind].value(root)).toEqual(initial),
        { once: true },
      );
      change(ui, root);
      expect(ui[kind].value(root)).toEqual(expected);
    });
    it("ignores native interaction beneath an inert ancestor", () => {
      const { ui, root, owner, handle } = fixture();
      const wrapper = owner.document.createElement("div");
      wrapper.inert = true;
      wrapper.setAttribute("inert", "");
      root.replaceWith(wrapper);
      wrapper.append(root);
      ui.enhance(root);
      dispatch(owner, handle, "keydown", { key: kind === "resizable" ? "ArrowRight" : " " });
      expect(ui[kind].value(root)).toEqual(initial);
      if (kind === "sortable") expect(root.dataset.state).toBe("idle");
    });
    it("rolls back listener acquisition interrupted by disposal", () => {
      const { ui, root, star } = fixture();
      const target = required(
        root.querySelector<HTMLElement>(
          kind === "resizable" ? '[data-part="handle"]' : '[data-part="list"]',
        ),
      );
      let acquired = false;
      const original = target.addEventListener.bind(target),
        remove = vi.spyOn(target, "removeEventListener");
      vi.spyOn(target, "addEventListener").mockImplementationOnce((type, listener, options) => {
        acquired = true;
        original(type, listener, options);
        star.dispose();
      });
      ui.enhance(root);
      expect(acquired).toBe(true);
      expect(remove).toHaveBeenCalled();
      const after = root.outerHTML;
      target.dispatchEvent(
        new Event(kind === "resizable" ? "keydown" : "click", { bubbles: true }),
      );
      expect(root.outerHTML).toBe(after);
    });
    it("retires native listeners after disposal during an initial attribute write", () => {
      const { ui, root, star, handle } = fixture();
      const target =
        kind === "resizable"
          ? handle
          : required(root.querySelector<HTMLElement>('[data-part="list"]'));
      const add = vi.spyOn(target, "addEventListener"),
        remove = vi.spyOn(target, "removeEventListener");
      let interrupted = false,
        frozen = "";
      const original = handle.setAttribute.bind(handle);
      vi.spyOn(handle, "setAttribute").mockImplementationOnce((name, value) => {
        original(name, value);
        interrupted = true;
        star.dispose();
        frozen = root.outerHTML;
      });
      ui.enhance(root);
      expect(interrupted).toBe(true);
      const active = add.mock.calls.filter(
        ([type, listener]) =>
          !remove.mock.calls.some(
            ([removedType, removedListener]) =>
              removedType === type && removedListener === listener,
          ),
      );
      expect(active).toHaveLength(0);
      expect(root.outerHTML).toBe(frozen);
    });
  });
  it.each(["adopt", "dispose-first"])(`${kind} rebinds an adopted controller after %s`, (mode) => {
    const source = setup(),
      destination = setup(true);
    const parts = kind === "resizable" ? resizable(source.owner) : sortable(source.owner);
    const moved = "form" in parts ? parts.form : parts.root;
    source.owner.document.body.append(moved);
    source.ui.enhance(parts.root);
    if (kind === "resizable") source.ui.resizable.set(parts.root, [25, 75]);
    else source.ui.sortable.move(parts.root, "a", 1);
    if (mode === "dispose-first") source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(moved));
    destination.ui.enhance(parts.root);
    source.star.dispose();
    expect(destination.ui[kind].value(parts.root)).toEqual(
      kind === "resizable" ? [25, 75] : ["b", "a", "c"],
    );
    expect(() => source.ui[kind].value(parts.root)).toThrow();
    const notifications: Event[] = [];
    parts.root.addEventListener(
      `jquery-star:${kind}:${kind === "resizable" ? "change" : "grab"}`,
      (event) => notifications.push(event),
    );
    dispatch(destination.owner, parts.handle, "keydown", {
      key: kind === "resizable" ? "ArrowRight" : " ",
    });
    if (kind === "resizable") expect(destination.ui.resizable.value(parts.root)).toEqual([30, 70]);
    else expect(parts.root.dataset.state).toBe("sorting");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toBeInstanceOf(destination.owner.CustomEvent);
  });
}

describeOwnerCases("resizable");
describe.each([false, true])("Resizable pointer constraints foreign=%s", (foreign) => {
  it("honors a canceled pointerdown", () => {
    const { ui, owner } = setup(foreign),
      { root, handle } = resizable(owner);
    owner.document.body.append(root);
    handle.addEventListener("pointerdown", (event) => event.preventDefault());
    ui.enhance(root);
    const capture = vi.fn();
    handle.setPointerCapture = capture;
    dispatch(owner, handle, "pointerdown", { button: 0 });
    expect(capture).not.toHaveBeenCalled();
    expect(handle.dataset.state).toBe("idle");
  });
});
describe.each([false, true])("Resizable native pointer control foreign=%s", (foreign) => {
  it("moves through the owner window and releases capture on pointer completion", () => {
    const { ui, owner } = setup(foreign),
      { root, handle } = resizable(owner);
    owner.document.body.append(root);
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new owner.DOMRect(0, 0, 500, 100));
    const captured = vi.fn(),
      released = vi.fn();
    handle.setPointerCapture = captured;
    handle.releasePointerCapture = released;
    ui.enhance(root);
    expect(handle.getAttribute("role")).toBe("separator");
    const pointer = (target: EventTarget, type: string, x: number) => {
      const event = new owner.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
      });
      Object.defineProperty(event, "pointerId", { value: 7 });
      target.dispatchEvent(event);
    };
    pointer(handle, "pointerdown", 100);
    expect(handle.dataset.state).toBe("dragging");
    expect(captured).toHaveBeenCalledExactlyOnceWith(7);
    pointer(owner, "pointermove", 150);
    expect(ui.resizable.value(root)).toEqual([60, 40]);
    pointer(owner, "pointerup", 150);
    expect(handle.dataset.state).toBe("idle");
    expect(released).toHaveBeenCalledExactlyOnceWith(7);
    pointer(owner, "pointermove", 200);
    expect(ui.resizable.value(root)).toEqual([60, 40]);
  });
});

describe.each([false, true])("Resizable interrupted work foreign=%s", (foreign) => {
  function fixture() {
    const installed = setup(foreign);
    const parts = resizable(installed.owner);
    installed.owner.document.body.append(parts.root);
    installed.ui.enhance(parts.root);
    vi.spyOn(parts.root, "getBoundingClientRect").mockReturnValue(
      new installed.owner.DOMRect(0, 0, 500, 100),
    );
    const captured = vi.fn(),
      released = vi.fn();
    parts.handle.setPointerCapture = captured;
    parts.handle.releasePointerCapture = released;
    const pointer = (target: EventTarget, type: string, x = 100) => {
      const event = new installed.owner.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
      });
      Object.defineProperty(event, "pointerId", { value: 9 });
      target.dispatchEvent(event);
    };
    return { ...installed, ...parts, captured, released, pointer };
  }
  it("does not persist an older request after a storage getter starts a newer one", () => {
    const { ui, owner, root } = fixture();
    root.dataset.storageKey = "reentrant";
    const writes = vi.fn();
    const storage = { setItem: writes } as unknown as Storage;
    vi.spyOn(owner, "localStorage", "get")
      .mockImplementationOnce(() => {
        ui.resizable.set(root, [70, 30]);
        return storage;
      })
      .mockImplementation(() => storage);
    const changed = vi.fn();
    root.addEventListener("jquery-star:resizable:change", changed);
    ui.resizable.set(root, [25, 75]);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
    expect(writes).toHaveBeenCalledExactlyOnceWith("jquery-star:resizable:reentrant", "[70,30]");
    expect(changed).toHaveBeenCalledOnce();
  });
  it("stops older rendering when a native write starts a newer request", () => {
    const { ui, root, first, handle } = fixture();
    const original = first.setAttribute.bind(first);
    vi.spyOn(first, "setAttribute").mockImplementationOnce((name, value) => {
      original(name, value);
      ui.resizable.set(root, [70, 30]);
    });
    const changed = vi.fn();
    root.addEventListener("jquery-star:resizable:change", changed);
    ui.resizable.set(root, [25, 75]);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
    expect(handle.getAttribute("aria-valuenow")).toBe("70");
    expect(changed).toHaveBeenCalledOnce();
  });
  it("retires capture acquired after disposal returns to native setup", () => {
    const { star, root, handle, captured, released, pointer } = fixture();
    let held = false;
    captured.mockImplementationOnce(() => {
      star.dispose();
      held = true;
    });
    released.mockImplementation(() => {
      held = false;
    });
    pointer(handle, "pointerdown");
    expect(captured).toHaveBeenCalledOnce();
    expect(released).toHaveBeenCalledTimes(2);
    expect(held).toBe(false);
    expect(root.dataset.value).toBe("[50,50]");
  });
  it("sweeps remaining pointer listeners and capture after one native removal throws", () => {
    const { ui, owner, root, handle, released, pointer } = fixture();
    const add = vi.spyOn(owner, "addEventListener"),
      nativeRemove = owner.removeEventListener.bind(owner);
    const failure = new Error("native removal failed");
    const remove = vi
      .spyOn(owner, "removeEventListener")
      .mockImplementation((type, callback, options) => {
        nativeRemove(type, callback, options);
        if (type === "pointermove") throw failure;
      });
    pointer(handle, "pointerdown");
    expect(handle.dataset.state).toBe("dragging");
    expect(() => ui.resizable.set(root, [25, 75])).toThrow(AggregateError);
    for (const [type, callback] of add.mock.calls.filter(([type]) => type.startsWith("pointer")))
      expect(
        remove.mock.calls.some(
          ([removedType, removedCallback]) => removedType === type && removedCallback === callback,
        ),
      ).toBe(true);
    expect(released).toHaveBeenCalledExactlyOnceWith(9);
    expect(handle.dataset.state).toBe("idle");
    pointer(owner, "pointermove", 150);
    expect(root.dataset.value).toBe("[50,50]");
  });
  it.each(["orientation", "constraint", "value", "parts"])(
    "retires the active pointer when %s changes before enhancement",
    (change) => {
      const { owner, root, first, handle, released, pointer } = fixture();
      pointer(handle, "pointerdown");
      expect(handle.dataset.state).toBe("dragging");
      if (change === "orientation") root.dataset.orientation = "vertical";
      if (change === "constraint") first.dataset.min = "45";
      if (change === "value") root.dataset.value = "[20,80]";
      if (change === "parts") handle.replaceWith(handle.cloneNode(true));
      pointer(owner, "pointermove", 150);
      expect(released).toHaveBeenCalledExactlyOnceWith(9);
      expect(root.dataset.value).toBe(change === "value" ? "[20,80]" : "[50,50]");
    },
  );
  it("rejects reordered direct anatomy even when panel and handle identities survive", () => {
    const { ui, root, handle } = fixture();
    const following = handle.nextSibling;
    root.append(handle);
    try {
      expect(() => ui.resizable.set(root, [25, 75])).toThrow(/alternate/);
    } finally {
      root.insertBefore(handle, following);
    }
  });
  it("validates patched constraints before accepting new sizes", () => {
    const { ui, root, first } = fixture();
    first.dataset.min = "90";
    first.dataset.max = "20";
    try {
      expect(() => ui.resizable.set(root, [25, 75])).toThrow(/data-min/);
      expect(root.dataset.value).toBe("[50,50]");
    } finally {
      delete first.dataset.min;
      delete first.dataset.max;
    }
  });
  it("ignores handles owned by a nested controller", () => {
    const { owner, root, handle, captured, pointer } = fixture();
    const nested = owner.document.createElement("button");
    nested.dataset.jqs = "toggle";
    handle.append(nested);
    dispatch(owner, nested, "keydown", { key: "ArrowRight" });
    pointer(nested, "pointerdown");
    expect(root.dataset.value).toBe("[50,50]");
    expect(captured).not.toHaveBeenCalled();
  });
  it("preserves authored labels and avoids generated ID collisions after insertion", () => {
    const { ui, owner, root, first, handle } = fixture();
    handle.removeAttribute("aria-label");
    handle.setAttribute("aria-labelledby", "authored-label");
    const panel = owner.document.createElement("div"),
      separator = owner.document.createElement("div");
    panel.dataset.part = "panel";
    separator.dataset.part = "handle";
    root.prepend(panel, separator);
    ui.enhance(root);
    expect(panel.id).not.toBe(first.id);
    expect(
      new Set([root.id, ...Array.from(root.querySelectorAll("[id]"), (node) => node.id)]).size,
    ).toBe(6);
    expect(handle.getAttribute("aria-labelledby")).toBe("authored-label");
    expect(handle.hasAttribute("aria-label")).toBe(false);
    expect(owner.document.getElementById(separator.getAttribute("aria-controls") ?? "")).toBe(
      panel,
    );
  });
});

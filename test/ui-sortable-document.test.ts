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
  const owner = foreign ? (required(frame.contentWindow) as Owner) : window;
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
function drag(
  owner: Owner,
  target: EventTarget,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  transfer?: { effectAllowed: string; setData: ReturnType<typeof vi.fn> },
) {
  const event = new owner.Event(type, { bubbles: true, cancelable: true });
  if (transfer) Object.defineProperty(event, "dataTransfer", { value: transfer });
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
describe.each([false, true])("Sortable foreign=%s", (foreign) => {
  it("preserves native form order and owner-window events", () => {
    const { ui, owner } = setup(foreign);
    const { root, form } = sortable(owner);
    const events: Event[] = [];
    root.addEventListener("jquery-star:sortable:change", (e) => events.push(e));
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["b", "a", "c"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["b", "a", "c"]);
    expect(events[0]).toBeInstanceOf(owner.CustomEvent);
  });
  it("keeps a newer request from before-change", () => {
    const { ui, owner } = setup(foreign);
    const { root } = sortable(owner);
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:sortable:before-change",
      () => ui.sortable.move(root, "c", 0),
      { once: true },
    );
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["c", "a", "b"]);
  });
  it.each(["click", "keydown"])("honors canceled native %s", (type) => {
    const { ui, owner } = setup(foreign);
    const { root, down, handle } = sortable(owner);
    const target = type === "click" ? down : handle;
    target.addEventListener(type, (e) => e.preventDefault());
    ui.enhance(root);
    dispatch(owner, target, type, { key: " " });
    expect(ui.sortable.value(root)).toEqual(["a", "b", "c"]);
    expect(root.dataset.state).toBe("idle");
  });
  it("reads a replacement list through the value facade", () => {
    const { ui, owner } = setup(foreign);
    const { root, list } = sortable(owner);
    ui.enhance(root);
    const replacement = list.cloneNode(true) as HTMLElement;
    replacement.prepend(required(replacement.lastElementChild));
    list.replaceWith(replacement);
    expect(ui.sortable.value(root)).toEqual(["c", "a", "b"]);
  });
  it("reads directly patched order through the value facade", () => {
    const { ui, owner } = setup(foreign);
    const { root } = sortable(owner);
    ui.enhance(root);
    root.dataset.value = '["c","b","a"]';
    expect(ui.sortable.value(root)).toEqual(["c", "b", "a"]);
  });
  it("keeps event detail separate from accepted ordering", () => {
    const { ui, owner } = setup(foreign);
    const { root } = sortable(owner);
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:sortable:before-change",
      (e) => (e as CustomEvent<{ value: string[] }>).detail.value.reverse(),
      { once: true },
    );
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["b", "a", "c"]);
  });
  it("retains listeners across unchanged enhancement", () => {
    const { ui, owner } = setup(foreign);
    const { root, list } = sortable(owner);
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const remove = vi.spyOn(list, "removeEventListener");
    ui.enhance(root);
    expect(remove).not.toHaveBeenCalled();
  });
});

describe.each([false, true])("Sortable native drag foreign=%s", (foreign) => {
  function fixture() {
    const installed = setup(foreign);
    const parts = sortable(installed.owner);
    installed.owner.document.body.append(parts.form);
    installed.ui.enhance(parts.root);
    return { ...installed, ...parts };
  }
  it("previews a native drag without submitting it, then commits a background drop", () => {
    const { ui, root, list, form, handle, owner } = fixture();
    const transfer = { effectAllowed: "uninitialized", setData: vi.fn() };
    const events: string[] = [];
    for (const name of ["grab", "before-change", "change", "drop"])
      root.addEventListener(`jquery-star:sortable:${name}`, () => events.push(name));
    for (const name of ["input", "change"]) root.addEventListener(name, () => events.push(name));
    expect(drag(owner, handle, "dragstart", transfer).defaultPrevented).toBe(false);
    expect(transfer.setData).toHaveBeenCalledWith("text/plain", "a");
    expect(transfer.effectAllowed).toBe("move");
    expect(root.dataset.state).toBe("sorting");
    expect(events).toEqual(["grab"]);
    const last = required(list.querySelector<HTMLElement>('[data-value="c"] [data-part="handle"]'));
    expect(drag(owner, last, "dragover").defaultPrevented).toBe(true);
    expect(ui.sortable.value(root)).toEqual(["b", "c", "a"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "b", "c"]);
    expect(drag(owner, list, "drop").defaultPrevented).toBe(true);
    expect(root.dataset.state).toBe("idle");
    expect(new owner.FormData(form).getAll("order")).toEqual(["b", "c", "a"]);
    expect(events).toEqual(["grab", "before-change", "change", "input", "change", "drop"]);
    drag(owner, handle, "dragend");
    expect(events).toHaveLength(6);
  });
  it("restores order and form values when native dragging ends without a drop", () => {
    const { root, list, form, handle, owner } = fixture();
    const events: string[] = [];
    for (const name of ["grab", "before-change", "change", "drop", "cancel"])
      root.addEventListener(`jquery-star:sortable:${name}`, () => events.push(name));
    drag(owner, handle, "dragstart");
    const last = required(list.querySelector<HTMLElement>('[data-value="c"] [data-part="handle"]'));
    drag(owner, last, "dragover");
    drag(owner, handle, "dragend");
    expect(root.dataset.state).toBe("idle");
    expect(root.dataset.value).toBe('["a","b","c"]');
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "b", "c"]);
    expect(events).toEqual(["grab", "cancel"]);
  });
  it("rejects non-handle, disabled and nested drag origins", () => {
    const { root, list, down, handle, owner } = fixture();
    const transfer = { effectAllowed: "uninitialized", setData: vi.fn() };
    expect(drag(owner, down, "dragstart", transfer).defaultPrevented).toBe(true);
    handle.setAttribute("disabled", "");
    expect(drag(owner, handle, "dragstart", transfer).defaultPrevented).toBe(false);
    const nested = owner.document.createElement("section");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<button data-part="handle">Nested handle</button>';
    required(list.firstElementChild).append(nested);
    expect(
      drag(owner, required(nested.firstElementChild), "dragstart", transfer).defaultPrevented,
    ).toBe(false);
    expect(root.dataset.state).toBe("idle");
    expect(transfer.setData).not.toHaveBeenCalled();
  });
  it("reports the retained order when a native drop is vetoed", () => {
    const { root, list, form, handle, owner } = fixture();
    drag(owner, handle, "dragstart");
    const last = required(list.querySelector<HTMLElement>('[data-value="c"] [data-part="handle"]'));
    drag(owner, last, "dragover");
    const events: string[] = [];
    const dropped: string[][] = [];
    root.addEventListener("jquery-star:sortable:before-change", (event) => {
      events.push("before-change");
      event.preventDefault();
    });
    root.addEventListener("jquery-star:sortable:change", () => events.push("change"));
    root.addEventListener("jquery-star:sortable:drop", (event) => {
      events.push("drop");
      dropped.push((event as CustomEvent<{ value: string[] }>).detail.value);
    });
    drag(owner, list, "drop");
    expect(root.dataset.state).toBe("idle");
    expect(root.dataset.value).toBe('["a","b","c"]');
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "b", "c"]);
    expect(dropped).toEqual([["a", "b", "c"]]);
    expect(events).toEqual(["before-change", "drop"]);
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

describeOwnerCases("sortable");
describe.each([false, true])("Sortable continuation foreign=%s", (foreign) => {
  it("stops older native notifications after a change callback starts a new move", () => {
    const { ui, owner } = setup(foreign),
      { root, form } = sortable(owner);
    owner.document.body.append(form);
    ui.enhance(root);
    const input = vi.fn();
    root.addEventListener("input", input);
    root.addEventListener("jquery-star:sortable:change", () => ui.sortable.move(root, "c", 0), {
      once: true,
    });
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["c", "b", "a"]);
    expect(input).toHaveBeenCalledOnce();
  });
  it("refreshes an authored order patched during a preview", () => {
    const { ui, owner } = setup(foreign),
      { root, form, handle } = sortable(owner);
    owner.document.body.append(form);
    ui.enhance(root);
    dispatch(owner, handle, "keydown", { key: " " });
    expect(root.dataset.state).toBe("sorting");
    root.dataset.value = '["c","b","a"]';
    expect(ui.sortable.value(root)).toEqual(["c", "b", "a"]);
    expect(root.dataset.state).toBe("idle");
  });
});

describe.each([false, true])("Sortable preview control foreign=%s", (foreign) => {
  it("keeps submitted order during preview and restores it on cancel", () => {
    const { ui, owner } = setup(foreign),
      { root, form, handle } = sortable(owner);
    owner.document.body.append(form);
    ui.enhance(root);
    const submitted = () => new owner.FormData(form).getAll("order");
    expect(submitted()).toEqual(["a", "b", "c"]);
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    expect(ui.sortable.value(root)).toEqual(["b", "c", "a"]);
    expect(submitted()).toEqual(["a", "b", "c"]);
    ui.enhance(root);
    expect(root.dataset.state).toBe("sorting");
    dispatch(owner, handle, "keydown", { key: "Escape" });
    expect(ui.sortable.value(root)).toEqual(["a", "b", "c"]);
    expect(submitted()).toEqual(["a", "b", "c"]);
    expect(root.dataset.state).toBe("idle");
  });
});

describe.each([false, true])("Sortable leading-hash action values foreign=%s", (foreign) => {
  function fixture() {
    const installed = setup(foreign);
    const parts = sortable(installed.owner);
    installed.owner.document.body.append(parts.form);
    const middle = required(parts.list.querySelectorAll<HTMLElement>('[data-part="item"]')[1]);
    middle.dataset.value = "#b";
    installed.ui.enhance(parts.root);
    return { ...installed, ...parts };
  }
  it("retains a leading hash in direct movement and native form order", () => {
    const { ui, root, form, owner } = fixture();
    ui.sortable.move(root, "#b", 2);
    expect(ui.sortable.value(root)).toEqual(["a", "c", "#b"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "c", "#b"]);
  });
  it.each(["up", "down", "move"] as const)(
    "keeps a leading-hash item value in an implicit %s action",
    async (operation) => {
      const { ui, root, jquery } = fixture();
      const instance = required(jquery(root).star().star("instance"));
      await instance.run(`ui.sortable.${operation}`, {
        args: operation === "move" ? ["#b", 2] : ["#b"],
      });
      expect(ui.sortable.value(root)).toEqual(
        operation === "up" ? ["#b", "a", "c"] : ["a", "c", "#b"],
      );
    },
  );
});

describe.each([false, true])("Sortable interrupted work foreign=%s", (foreign) => {
  function fixture() {
    const installed = setup(foreign),
      parts = sortable(installed.owner);
    installed.owner.document.body.append(parts.form);
    installed.ui.enhance(parts.root);
    return { ...installed, ...parts };
  }
  it("leaves navigation keys native until an item is grabbed", () => {
    const { owner, handle } = fixture();
    for (const key of ["ArrowUp", "ArrowDown", "Home", "End", "Escape"])
      expect(dispatch(owner, handle, "keydown", { key }).defaultPrevented).toBe(false);
  });
  it("keeps native focus on a keyboard preview through movement and cancellation", () => {
    const { owner, handle } = fixture();
    handle.focus();
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    expect(owner.document.activeElement).toBe(handle);
    dispatch(owner, handle, "keydown", { key: "Escape" });
    expect(owner.document.activeElement).toBe(handle);
  });
  it("does not steal focus moved during a native append", () => {
    const { owner, handle, form, list } = fixture();
    const outside = owner.document.createElement("button");
    outside.type = "button";
    form.append(outside);
    handle.focus();
    const nativeAppend = list.append.bind(list);
    let interrupted = false;
    vi.spyOn(list, "append").mockImplementationOnce((...nodes) => {
      nativeAppend(...nodes);
      interrupted = true;
      outside.focus();
    });
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    expect(interrupted).toBe(true);
    expect(owner.document.activeElement).toBe(outside);
  });
  it("finishes all notifications when a native move disables its initiating button", () => {
    const { root, list, owner } = fixture();
    const middle = required(list.children[1]),
      down = required(middle.querySelector("button[data-part=down]"));
    const events: string[] = [];
    for (const name of ["jquery-star:sortable:change", "input", "change"])
      root.addEventListener(name, () => events.push(name));
    dispatch(owner, down, "click");
    expect(root.dataset.value).toBe('["a","c","b"]');
    expect(events).toEqual(["jquery-star:sortable:change", "input", "change"]);
    expect(down.hasAttribute("disabled")).toBe(true);
  });
  it("drops a live preview onto the native list background", () => {
    const { ui, root, form, owner, list, handle } = fixture();
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    expect(ui.sortable.value(root)).toEqual(["b", "c", "a"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "b", "c"]);
    dispatch(owner, list, "drop");
    expect(root.dataset.state).toBe("idle");
    expect(new owner.FormData(form).getAll("order")).toEqual(["b", "c", "a"]);
  });
  it("lets an alternative button replace a preview with a committed movement", () => {
    const { ui, root, form, owner, list, handle } = fixture();
    const down = required(list.children[1]?.querySelector("button[data-part=down]"));
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    dispatch(owner, down, "click");
    expect(root.dataset.state).toBe("idle");
    expect(ui.sortable.value(root)).toEqual(["a", "c", "b"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["a", "c", "b"]);
  });
  it("rejects duplicate patched item values before serializing form state", () => {
    const { ui, root, list } = fixture();
    const second = required(list.children[1]);
    second.setAttribute("data-value", "a");
    try {
      expect(() => ui.sortable.move(root, "a", 2)).toThrow(/unique/);
      expect(root.dataset.value).toBe('["a","b","c"]');
    } finally {
      second.setAttribute("data-value", "b");
    }
  });
  it("keeps a newer request started by a native item move", () => {
    const { ui, root, list, form, owner } = fixture();
    const nativeAppend = list.append.bind(list);
    vi.spyOn(list, "append").mockImplementationOnce((...nodes) => {
      nativeAppend(...nodes);
      ui.sortable.move(root, "c", 0);
    });
    const changes = vi.fn();
    root.addEventListener("jquery-star:sortable:change", changes);
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["c", "a", "b"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["c", "a", "b"]);
    expect(changes).toHaveBeenCalledOnce();
  });
  it("stops generating old hidden inputs after a native append starts a newer request", () => {
    const { ui, root, form, owner } = fixture();
    const nativeAppend = root.append.bind(root);
    vi.spyOn(root, "append").mockImplementationOnce((...nodes) => {
      nativeAppend(...nodes);
      ui.sortable.move(root, "c", 0);
    });
    ui.sortable.move(root, "a", 1);
    expect(ui.sortable.value(root)).toEqual(["c", "b", "a"]);
    expect(new owner.FormData(form).getAll("order")).toEqual(["c", "b", "a"]);
  });
  it("removes every old listener even if one native removal throws", () => {
    const { ui, root, list } = fixture();
    const nativeRemove = list.removeEventListener.bind(list);
    const removed: string[] = [];
    vi.spyOn(list, "removeEventListener").mockImplementation((type, callback, options) => {
      nativeRemove(type, callback, options);
      removed.push(type);
      if (type === "click") throw new Error("native removal failed");
    });
    list.replaceWith(list.cloneNode(true));
    expect(() => ui.enhance(root)).toThrow(AggregateError);
    expect(removed).toEqual(["click", "keydown", "dragstart", "dragover", "drop", "dragend"]);
  });
  it("does not overwrite a direct authored patch when a preview is disposed", () => {
    const { star, root, owner, handle } = fixture();
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    root.dataset.value = '["c","a","b"]';
    star.dispose();
    expect(root.dataset.value).toBe('["c","a","b"]');
  });
  it("ignores a nested controller's native buttons and keys", () => {
    const { root, list, owner } = fixture();
    const nested = owner.document.createElement("section");
    nested.dataset.jqs = "custom";
    nested.innerHTML =
      '<button type="button" data-part="down">Nested</button><button type="button" data-part="handle">Handle</button>';
    required(list.firstElementChild).append(nested);
    dispatch(owner, required(nested.firstElementChild), "click");
    dispatch(owner, required(nested.lastElementChild), "keydown", { key: " " });
    expect(root.dataset.value).toBe('["a","b","c"]');
    expect(root.dataset.state).toBe("idle");
  });
  it("reports the retained order after a canceled drop", () => {
    const { root, owner, handle } = fixture();
    dispatch(owner, handle, "keydown", { key: " " });
    dispatch(owner, handle, "keydown", { key: "End" });
    root.addEventListener("jquery-star:sortable:before-change", (event) => event.preventDefault(), {
      once: true,
    });
    const values: string[][] = [];
    root.addEventListener("jquery-star:sortable:drop", (event) =>
      values.push((event as CustomEvent<{ value: string[] }>).detail.value),
    );
    dispatch(owner, handle, "keydown", { key: " " });
    expect(values).toEqual([["a", "b", "c"]]);
    expect(root.dataset.value).toBe('["a","b","c"]');
  });
  it("preserves labelledby and generates distinct item IDs after prepend", () => {
    const { ui, root, list, handle, owner } = fixture();
    handle.removeAttribute("aria-label");
    handle.setAttribute("aria-labelledby", "authored-label");
    const first = required(list.firstElementChild);
    const inserted = owner.document.createElement("li");
    inserted.dataset.part = "item";
    inserted.dataset.value = "new";
    list.prepend(inserted);
    ui.enhance(root);
    expect(inserted.id).not.toBe(first.id);
    expect(new Set(Array.from(list.children, (item) => item.id)).size).toBe(4);
    expect(handle.hasAttribute("aria-label")).toBe(false);
    expect(handle.getAttribute("aria-labelledby")).toBe("authored-label");
  });
});

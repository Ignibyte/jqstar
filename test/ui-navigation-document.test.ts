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
});
type Kind = "tabs" | "toolbar" | "pagination" | "sidebar";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "sample";
  if (kind === "tabs") {
    root.dataset.value = "a";
    root.innerHTML =
      '<div data-part="list"><button data-part="trigger" data-value="a">A</button><button data-part="trigger" data-value="b">B</button><button data-part="trigger" data-value="c">C</button></div><div data-part="panel" data-value="a">A</div><div data-part="panel" data-value="b">B</div><div data-part="panel" data-value="c">C</div>';
  } else if (kind === "toolbar") {
    root.innerHTML =
      '<button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button><input data-part="item" data-value="text" value="Draft">';
  } else if (kind === "pagination") {
    root.dataset.page = "1";
    root.dataset.pageCount = "3";
    root.dataset.navigation = "manual";
    root.innerHTML =
      '<button data-part="page" data-page="1">1</button><button data-part="page" data-page="2">2</button><button data-part="page" data-page="3">3</button><span data-part="status"></span>';
  } else {
    root.dataset.value = "expanded";
    root.dataset.collapsible = "icon";
    root.innerHTML =
      '<aside data-part="panel"><button>Panel focus</button></aside><button data-part="trigger">Toggle</button><button data-part="rail">Rail</button><button data-part="backdrop">Backdrop</button><div data-part="content">Content</div>';
  }
  owner.document.body.append(root);
  return root;
}
function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function read(ui: UI, kind: Kind, root: HTMLElement | string) {
  if (kind === "tabs") return ui.tabs.value(root);
  if (kind === "toolbar") return ui.toolbar.value(root);
  if (kind === "pagination") return ui.pagination.page(root);
  return ui.sidebar.value(root);
}
function set(ui: UI, kind: Kind, root: HTMLElement, newer = false) {
  if (kind === "tabs") ui.tabs.activate(root, newer ? "c" : "b");
  else if (kind === "toolbar") ui.toolbar.focus(root, newer ? "text" : "b");
  else if (kind === "pagination") ui.pagination.goTo(root, newer ? 3 : 2);
  else if (newer) ui.sidebar.open(root);
  else ui.sidebar.close(root);
}
function expected(kind: Kind, newer = false) {
  return kind === "sidebar" ? newer : kind === "pagination" ? (newer ? 3 : 2) : newer ? "c" : "b";
}
function native(kind: Kind, root: HTMLElement, owner: Window = window) {
  if (kind === "tabs") root.querySelector<HTMLElement>('[data-value="b"]')?.click();
  else if (kind === "toolbar") {
    const first = part(root, "item");
    first.focus();
    first.dispatchEvent(
      new (owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
      }),
    );
  } else if (kind === "pagination") root.querySelector<HTMLElement>('[data-page="2"]')?.click();
  else part(root, "trigger").click();
}
function target(kind: Kind, root: HTMLElement) {
  return kind === "toolbar" ? root : part(root, kind === "pagination" ? "page" : "trigger");
}
function state(kind: Kind, root: HTMLElement) {
  return kind === "pagination" ? root.dataset.page : root.dataset.value;
}

describe.each(["tabs", "toolbar", "pagination", "sidebar"] as const)(
  "%s document lifetime",
  (kind) => {
    it("keeps a newer request during first scoped observer acquisition", () => {
      const { owner, ui } = install(realm());
      const root = fixture(kind, owner);
      const prototype = (owner as Window & typeof globalThis).MutationObserver.prototype;
      const observe = prototype.observe;
      let entered = false;
      vi.spyOn(prototype, "observe").mockImplementationOnce(function (
        this: MutationObserver,
        ...args
      ) {
        entered = true;
        set(ui, kind, root);
        observe.apply(this, args);
      });
      ui.enhance(root);
      expect(entered).toBe(true);
      expect(read(ui, kind, root)).toEqual(expected(kind));
      native(kind, root, owner);
      expect(read(ui, kind, root)).toEqual(kind === "sidebar" ? true : expected(kind));
    });
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
      native(kind, root, owner);
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it.each(["enhance", "facade"] as const)(
      "reacquires adoption through %s before source disposal",
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
    it("runs a private action in a foreign installation", () => {
      const { owner, jquery, ui } = install(realm());
      const root = fixture(kind, owner);
      const button = owner.document.createElement("button");
      const expression =
        kind === "tabs"
          ? "@ui.tabs.activate('b')"
          : kind === "toolbar"
            ? "@ui.toolbar.focus('b')"
            : kind === "pagination"
              ? "@ui.pagination.page(2)"
              : "@ui.sidebar.close()";
      button.setAttribute("data-on:click", expression);
      root.append(button);
      jquery(root).star();
      button.click();
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it("retains exact native bindings during unchanged enhancement", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      const binding = target(kind, root);
      const add = vi.spyOn(binding, "addEventListener");
      const remove = vi.spyOn(binding, "removeEventListener");
      ui.enhance(root);
      ui.enhance(root);
      expect(add).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      native(kind, root);
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it("releases a listener registered before setup throws", () => {
      const { ui } = install();
      const root = fixture(kind);
      const binding = target(kind, root);
      const add = binding.addEventListener.bind(binding);
      const remove = vi.spyOn(binding, "removeEventListener");
      vi.spyOn(binding, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("native setup failed");
      });
      expect(() => ui.enhance(root)).toThrow("native setup failed");
      expect(remove).toHaveBeenCalled();
      vi.restoreAllMocks();
      ui.enhance(root);
      native(kind, root);
      expect(read(ui, kind, root)).toEqual(expected(kind));
    });
    it("removes a listener registered after disposal", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const binding = target(kind, root);
      const add = binding.addEventListener.bind(binding);
      const remove = vi.spyOn(binding, "removeEventListener");
      vi.spyOn(binding, "addEventListener").mockImplementationOnce((...args) => {
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
    it("sweeps later native cleanup after an earlier removal throws", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      ui.enhance(root);
      const binding = target(kind, root);
      const remove = binding.removeEventListener.bind(binding);
      const removed: string[] = [];
      vi.spyOn(binding, "removeEventListener").mockImplementation((...args) => {
        remove(...args);
        removed.push(args[0]);
        if (removed.length === 1) throw new Error("native cleanup failed");
      });
      const later =
        kind === "pagination"
          ? required(root.querySelector<HTMLElement>('[data-page="2"]'))
          : kind === "sidebar"
            ? part(root, "rail")
            : binding;
      const sweep = later === binding ? undefined : vi.spyOn(later, "removeEventListener");
      failedDisposals.add(star);
      expect(() => star.dispose()).toThrow();
      if (sweep) expect(sweep).toHaveBeenCalled();
      else expect(removed.length).toBeGreaterThan(1);
    });
  },
);

describe.each(["tabs", "pagination", "sidebar"] as const)("%s callback continuation", (kind) => {
  it("emits events from the destination window", () => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const events: Event[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) => events.push(event));
    set(destination.ui, kind, root);
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((destination.owner as Window & typeof globalThis).CustomEvent);
  });
  it("keeps a newer request made during before-change", () => {
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
        else {
          const old = part(root, kind === "pagination" ? "page" : "panel");
          old.replaceWith(old.cloneNode(true));
        }
      },
      { once: true },
    );
    set(source.ui, kind, root);
    expect(state(kind, root)).toBe(before);
    expect(changed).not.toHaveBeenCalled();
  });
});

it.each([false, true])("Toolbar preserves native input arrows after adoption=%s", (adopted) => {
  const source = install();
  const destination = install(realm());
  const root = fixture("toolbar", adopted ? window : destination.owner);
  if (adopted) {
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  }
  destination.ui.enhance(root);
  const input = required(root.querySelector("input"));
  input.focus();
  input.setSelectionRange(1, 3);
  const event = new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
    key: "ArrowRight",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(destination.owner.document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(1);
  expect(input.selectionEnd).toBe(3);
});
it.each(["ctrlKey", "metaKey", "shiftKey", "altKey", "button"] as const)(
  "Pagination preserves native %s link activation",
  (modifier) => {
    const { ui } = install();
    const root = fixture("pagination");
    const old = required(root.querySelector('[data-page="2"]'));
    const link = document.createElement("a");
    link.dataset.part = "page";
    link.dataset.page = "2";
    link.href = "?page=2";
    old.replaceWith(link);
    ui.enhance(root);
    let prevented = false;
    link.addEventListener("click", (event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    });
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        [modifier]: modifier === "button" ? 1 : true,
      }),
    );
    expect(prevented).toBe(false);
    expect(ui.pagination.page(root)).toBe(1);
  },
);
function mobile(owner: Window, initial: boolean) {
  const query = new (owner as Window & typeof globalThis).EventTarget();
  let matches = initial;
  Object.defineProperty(query, "matches", { get: () => matches });
  Object.defineProperty(owner, "matchMedia", { configurable: true, value: () => query });
  return {
    query,
    set(next: boolean) {
      matches = next;
      const event = new (owner as Window & typeof globalThis).Event("change");
      Object.defineProperty(event, "matches", { value: next });
      query.dispatchEvent(event);
    },
  };
}
it("Sidebar preserves desktop preference across a mobile destination", () => {
  const source = install(realm());
  const destination = install(realm());
  const oldMedia = mobile(source.owner, false);
  const nextMedia = mobile(destination.owner, true);
  const root = fixture("sidebar", source.owner);
  source.ui.enhance(root);
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  destination.ui.enhance(root);
  expect(destination.ui.sidebar.value(root)).toBe(false);
  source.star.dispose();
  oldMedia.set(true);
  nextMedia.set(false);
  expect(destination.ui.sidebar.value(root)).toBe(true);
});
it.each(["cancel", "reopen"] as const)("Sidebar does not return focus after %s", (mode) => {
  const { ui, owner } = install(realm());
  mobile(owner, true);
  const root = fixture("sidebar", owner);
  ui.enhance(root);
  part(root, "trigger").click();
  ui.sidebar.open(root);
  const inside = required(part(root, "panel").querySelector("button"));
  inside.focus();
  if (mode === "cancel")
    root.addEventListener("jquery-star:sidebar:before-change", (event) => event.preventDefault(), {
      once: true,
    });
  else
    root.addEventListener("jquery-star:sidebar:change", () => ui.sidebar.open(root), {
      once: true,
    });
  root.dispatchEvent(
    new (owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    }),
  );
  expect(ui.sidebar.value(root)).toBe(true);
  expect(owner.document.activeElement).toBe(inside);
});
it.each(["tabs", "toolbar", "pagination", "sidebar"] as const)(
  "%s preserves destination ownership acquired inside old cleanup",
  (kind) => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    source.ui.enhance(root);
    const binding = target(kind, root);
    const remove = binding.removeEventListener.bind(binding);
    vi.spyOn(binding, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    native(kind, root, destination.owner);
    expect(read(destination.ui, kind, root)).toEqual(expected(kind));
  },
);
it("Tabs preserves manual roving focus during unchanged enhancement", () => {
  const { ui } = install();
  const root = fixture("tabs");
  root.dataset.activation = "manual";
  ui.enhance(root);
  const first = part(root, "trigger");
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  const next = required(root.querySelector<HTMLElement>('[data-part="trigger"][data-value="b"]'));
  ui.enhance(root);
  expect(document.activeElement).toBe(next);
  expect(next.tabIndex).toBe(0);
  expect(first.tabIndex).toBe(-1);
  expect(ui.tabs.value(root)).toBe("a");
});
it("Sidebar restores desktop preference when adoption follows source disposal", () => {
  const source = install(realm());
  const destination = install(realm());
  const oldMedia = mobile(source.owner, false);
  mobile(destination.owner, false);
  const root = fixture("sidebar", source.owner);
  source.ui.enhance(root);
  oldMedia.set(true);
  source.star.dispose();
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  expect(destination.ui.sidebar.value(root)).toBe(true);
});
it("Sidebar reflects a changed collapse mode in the current mobile viewport", () => {
  const { ui, owner } = install(realm());
  mobile(owner, true);
  const root = fixture("sidebar", owner);
  ui.enhance(root);
  root.dataset.collapsible = "none";
  ui.enhance(root);
  expect(root.dataset.mobile).toBe("false");
  root.dataset.collapsible = "icon";
  ui.enhance(root);
  expect(root.dataset.mobile).toBe("true");
  expect(ui.sidebar.value(root)).toBe(false);
});
it("Sidebar uses only destination media, storage and document shortcuts", () => {
  const source = install(realm());
  const destination = install(realm());
  const oldMedia = mobile(source.owner, false);
  mobile(destination.owner, false);
  const oldValues: string[] = [];
  const nextValues: string[] = [];
  for (const [owner, values] of [
    [source.owner, oldValues],
    [destination.owner, nextValues],
  ] as const) {
    Object.defineProperty(owner, "localStorage", {
      configurable: true,
      value: { getItem: () => null, setItem: (_key: string, value: string) => values.push(value) },
    });
  }
  const root = fixture("sidebar", source.owner);
  root.dataset.storageKey = "navigation-test";
  source.ui.enhance(root);
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  destination.ui.enhance(root);
  oldMedia.set(true);
  source.owner.document.dispatchEvent(
    new (source.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
    }),
  );
  expect(destination.ui.sidebar.value(root)).toBe(true);
  destination.owner.document.dispatchEvent(
    new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
    }),
  );
  expect(destination.ui.sidebar.value(root)).toBe(false);
  expect(oldValues).toEqual([]);
  expect(nextValues).toEqual(["collapsed"]);
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing navigation fixture control.");
  return value;
}

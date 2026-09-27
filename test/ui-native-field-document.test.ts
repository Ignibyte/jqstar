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
  return { star, jquery, ui: star.use(uiPlugin), owner };
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  if (!frame.contentWindow) throw new Error("Missing fixture frame");
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
type Kind = "number-field" | "password-field" | "search-field" | "rating";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "sample";
  root.innerHTML =
    kind === "number-field"
      ? '<input data-part="control" type="number" value="1"><button data-part="decrement">-</button><button data-part="increment">+</button>'
      : kind === "password-field"
        ? '<input data-part="control" type="password" value="secret"><button data-part="toggle">Toggle</button><span data-part="status"></span>'
        : kind === "search-field"
          ? '<input data-part="control" type="search" value="query"><button data-part="clear">Clear</button>'
          : '<input data-part="control" type="radio" name="rating" value="1" checked><input data-part="control" type="radio" name="rating" value="2"><input data-part="control" type="radio" name="rating" value="3"><output data-part="status"></output>';
  owner.document.body.append(root);
  return root;
}
function control(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector("input");
  if (!input) throw new Error("Missing control");
  return input;
}
function trigger(kind: Kind, root: HTMLElement): HTMLElement {
  const part =
    kind === "number-field"
      ? '[data-part="increment"]'
      : kind === "rating"
        ? 'input[value="2"]'
        : "button";
  const button = root.querySelector<HTMLElement>(part);
  if (!button) throw new Error("Missing trigger");
  return button;
}
function read(ui: UI, kind: Kind, root: HTMLElement | string) {
  if (kind === "number-field") return ui.numberField.value(root);
  if (kind === "password-field") return ui.passwordField.visible(root);
  if (kind === "search-field") return ui.searchField.value(root);
  return ui.rating.value(root);
}
function set(ui: UI, kind: Kind, root: HTMLElement, newer = false) {
  if (kind === "number-field") ui.numberField.set(root, newer ? 3 : 2);
  else if (kind === "password-field") {
    if (newer) ui.passwordField.hide(root);
    else ui.passwordField.show(root);
  } else if (kind === "search-field") ui.searchField.set(root, newer ? "newer" : "");
  else ui.rating.set(root, newer ? "3" : "2");
}
function changed(kind: Kind, newer = false) {
  return kind === "number-field"
    ? newer
      ? 3
      : 2
    : kind === "password-field"
      ? !newer
      : kind === "search-field"
        ? newer
          ? "newer"
          : ""
        : newer
          ? "3"
          : "2";
}
function nativeValue(kind: Kind, root: HTMLElement) {
  if (kind === "password-field") return control(root).type === "text";
  if (kind === "rating") return root.querySelector<HTMLInputElement>("input:checked")?.value;
  if (kind === "number-field") return Number(control(root).value);
  return control(root).value;
}

describe.each(["number-field", "password-field", "search-field", "rating"] as const)(
  "%s native document lifetime",
  (kind) => {
    it.each(["element", "selector"] as const)("accepts its own foreign %s target", (target) => {
      const { owner, ui } = install(realm());
      const root = fixture(kind, owner);
      ui.enhance(root);
      expect(read(ui, kind, target === "element" ? root : "#sample")).toBe(nativeValue(kind, root));
      set(ui, kind, root);
      expect(read(ui, kind, root)).toBe(changed(kind));
    });
    it("automatically enhances its foreign document", async () => {
      const { owner, ui, star } = install(realm());
      await star.whenEnhanced();
      const root = fixture(kind, owner);
      await star.whenEnhanced();
      expect(root.dataset.state).toBeDefined();
      trigger(kind, root).click();
      expect(read(ui, kind, root)).toBe(changed(kind));
    });
    it.each(["enhance", "facade"] as const)(
      "reacquires an adopted root through %s before source disposal",
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
        trigger(kind, root).click();
        expect(read(destination.ui, kind, root)).toBe(changed(kind));
      },
    );
    it("uses destination constructors for component and synthesized native events", () => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      const component: Event[] = [];
      const native: Event[] = [];
      root.addEventListener(`jquery-star:${kind}:change`, (event) => component.push(event));
      root.addEventListener("input", (event) => native.push(event));
      root.addEventListener("change", (event) => native.push(event));
      set(destination.ui, kind, root);
      const constructors = destination.owner as Window & typeof globalThis;
      expect(component).toHaveLength(1);
      expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
      expect(native).toHaveLength(kind === "password-field" ? 0 : 2);
      expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    });
    it("runs an implicit private action in a foreign document", () => {
      const { owner, jquery, ui } = install(realm());
      const root = fixture(kind, owner);
      const button = owner.document.createElement("button");
      const expression =
        kind === "number-field"
          ? "@ui.number-field.set(2)"
          : kind === "password-field"
            ? "@ui.password-field.show()"
            : kind === "search-field"
              ? "@ui.search-field.clear()"
              : "@ui.rating.set('2')";
      button.setAttribute("data-on:click", expression);
      root.append(button);
      jquery(root).star();
      button.click();
      expect(read(ui, kind, root)).toBe(changed(kind));
    });
    it("preserves silent native changes when adopting an already enhanced root", () => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      if (kind === "rating") (trigger(kind, root) as HTMLInputElement).checked = true;
      else if (kind === "password-field") control(root).type = "text";
      else control(root).value = kind === "number-field" ? "2" : "";
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      destination.ui.enhance(root);
      expect(read(destination.ui, kind, root)).toBe(changed(kind));
    });
    it("keeps a newer operation started by before-change", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      root.addEventListener(`jquery-star:${kind}:before-change`, () => set(ui, kind, root, true), {
        once: true,
      });
      set(ui, kind, root);
      expect(read(ui, kind, root)).toBe(changed(kind, true));
    });
    it.each(["adopt", "replace"] as const)(
      "stops a transition when before-change listeners %s its controls",
      (mode) => {
        const source = install();
        const destination = install(realm());
        const root = fixture(kind);
        source.ui.enhance(root);
        const before = nativeValue(kind, root);
        const changedEvent = vi.fn();
        root.addEventListener(`jquery-star:${kind}:change`, changedEvent);
        root.addEventListener(
          `jquery-star:${kind}:before-change`,
          () => {
            if (mode === "adopt")
              destination.owner.document.body.append(destination.owner.document.adoptNode(root));
            else control(root).replaceWith(control(root).cloneNode(true));
          },
          { once: true },
        );
        set(source.ui, kind, root);
        expect(nativeValue(kind, root)).toBe(before);
        expect(changedEvent).not.toHaveBeenCalled();
      },
    );
    it("retires listeners acquired before a later native registration throws", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const target =
        kind === "number-field"
          ? trigger(kind, root)
          : kind === "password-field" || kind === "search-field"
            ? control(root)
            : root;
      const add = target.addEventListener.bind(target);
      let calls = 0;
      vi.spyOn(target, "addEventListener").mockImplementation((...args) => {
        add(...args);
        calls += 1;
        if (calls === 1) throw new Error("native registration failed");
      });
      expect(() => ui.enhance(root)).toThrow("native registration failed");
      vi.restoreAllMocks();
      star.dispose();
      const changedEvent = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changedEvent);
      const before = nativeValue(kind, root);
      trigger(kind, root).click();
      expect(changedEvent).not.toHaveBeenCalled();
      if (kind !== "rating") expect(nativeValue(kind, root)).toBe(before);
    });
    it("removes a native listener returned after reentrant disposal", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const target =
        kind === "number-field"
          ? trigger(kind, root)
          : kind === "password-field"
            ? trigger(kind, root)
            : kind === "search-field"
              ? control(root)
              : root;
      const add = target.addEventListener.bind(target);
      const remove = vi.spyOn(target, "removeEventListener");
      vi.spyOn(target, "addEventListener").mockImplementation((...args) => {
        star.dispose();
        add(...args);
      });
      try {
        ui.enhance(root);
      } catch {
        /* A disposed setup may reject. */
      }
      expect(remove).toHaveBeenCalled();
    });
  },
);

it.each(["number-field", "search-field", "rating"] as const)(
  "%s stops older native notifications after input starts newer work",
  (kind) => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const changes: unknown[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      changes.push((event as CustomEvent<{ value: unknown }>).detail.value),
    );
    root.addEventListener("input", () => set(ui, kind, root, true), { once: true });
    set(ui, kind, root);
    expect(read(ui, kind, root)).toBe(changed(kind, true));
    expect(changes).toEqual([changed(kind, true)]);
  },
);

it("Rating honors a canceled reset and keeps queued work through unchanged enhancement", () => {
  vi.useFakeTimers();
  const { ui } = install();
  const root = fixture("rating");
  const form = document.createElement("form");
  root.before(form);
  form.append(root);
  ui.enhance(root);
  ui.rating.set(root, "2");
  const changedEvent = vi.fn();
  root.addEventListener("jquery-star:rating:change", changedEvent);
  form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
  form.reset();
  vi.runOnlyPendingTimers();
  expect(ui.rating.value(root)).toBe("2");
  expect(changedEvent).not.toHaveBeenCalled();
  form.reset();
  ui.enhance(root);
  vi.runOnlyPendingTimers();
  expect(ui.rating.value(root)).toBe("1");
  expect(changedEvent).toHaveBeenCalledOnce();
});

it.each(["number-field", "search-field", "rating"] as const)(
  "%s resets native state in the destination document",
  (kind) => {
    vi.useFakeTimers();
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    const form = document.createElement("form");
    root.before(form);
    form.append(root);
    source.ui.enhance(root);
    set(source.ui, kind, root);
    form.reset();
    destination.owner.document.body.append(destination.owner.document.adoptNode(form));
    destination.ui.enhance(root);
    source.star.dispose();
    set(destination.ui, kind, root, true);
    vi.runOnlyPendingTimers();
    expect(read(destination.ui, kind, root)).toBe(changed(kind, true));
    form.reset();
    destination.ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(root.dataset.value).toBe(kind === "search-field" ? "query" : "1");
  },
);

it.each(["number-field", "search-field", "rating"] as const)(
  "%s cancels a reset timer returned after disposal",
  (kind) => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const root = fixture(kind);
    const form = document.createElement("form");
    root.before(form);
    form.append(root);
    ui.enhance(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(window, "clearTimeout");
    let handle: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementation((callback, delay, ...args) => {
      star.dispose();
      handle = schedule(callback, delay, ...args);
      return handle;
    });
    form.reset();
    expect(handle).toBeDefined();
    expect(clear).toHaveBeenCalledWith(handle);
  },
);

it.each(["number-field", "password-field", "search-field", "rating"] as const)(
  "%s sweeps remaining listeners after a native release throws",
  (kind) => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const target =
      kind === "number-field"
        ? root.querySelector('[data-part="decrement"]')
        : kind === "password-field"
          ? trigger(kind, root)
          : kind === "search-field"
            ? control(root)
            : root;
    if (!target) throw new Error("Missing release target");
    const remove = target.removeEventListener.bind(target);
    vi.spyOn(target, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("native release failed");
    });
    const lastTarget = kind === "rating" ? root : control(root);
    const released =
      lastTarget === target ? undefined : vi.spyOn(lastTarget, "removeEventListener");
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    if (released) expect(released).toHaveBeenCalled();
    vi.restoreAllMocks();
    const changedEvent = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changedEvent);
    trigger(kind, root).click();
    expect(changedEvent).not.toHaveBeenCalled();
  },
);

it("Number Field stops a step superseded by changed native constraints", () => {
  const { ui } = install();
  const root = fixture("number-field");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:number-field:before-change",
    () => {
      control(root).max = "1";
    },
    { once: true },
  );
  ui.numberField.increment(root);
  expect(control(root).value).toBe("1");
});
it("Search Field keeps a native edit made during before-change", () => {
  const { ui } = install();
  const root = fixture("search-field");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:search-field:before-change",
    () => {
      control(root).value = "new native value";
    },
    { once: true },
  );
  ui.searchField.clear(root);
  expect(control(root).value).toBe("new native value");
});
it("Rating stops when the requested radio changes value during before-change", () => {
  const { ui } = install();
  const root = fixture("rating");
  ui.enhance(root);
  const next = trigger("rating", root) as HTMLInputElement;
  root.addEventListener(
    "jquery-star:rating:before-change",
    () => {
      next.value = "other";
    },
    { once: true },
  );
  ui.rating.set(root, "2");
  expect(control(root).checked).toBe(true);
  expect(ui.rating.value(root)).toBe("1");
});

it("Search Field submits a readonly native control through its form", () => {
  const { ui } = install();
  const root = fixture("search-field");
  const form = document.createElement("form");
  root.before(form);
  form.append(root);
  control(root).readOnly = true;
  ui.enhance(root);
  const submit = vi.fn((event: Event) => event.preventDefault());
  form.addEventListener("submit", submit);
  ui.searchField.submit(root);
  expect(submit).toHaveBeenCalledOnce();
  expect(control(root).value).toBe("query");
});

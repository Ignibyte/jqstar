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
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing fixture control");
  return value;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) {
    if (failedDisposals.delete(star)) expect(() => star.dispose()).toThrow();
    else star.dispose();
  }
  document.body.replaceChildren();
});
type Kind = "collapsible" | "accordion" | "editable" | "stepper";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window): HTMLElement {
  const root = owner.document.createElement(kind === "collapsible" ? "details" : "section");
  root.dataset.jqs = kind;
  root.id = "sample";
  const content =
    '<summary data-part="trigger">Open</summary><div data-part="content">Content</div>';
  if (kind === "collapsible") root.innerHTML = content;
  else if (kind === "accordion")
    root.innerHTML = `<details id="item-a" data-part="item">${content}</details><details data-part="item">${content}</details><details data-part="item">${content}</details>`;
  else if (kind === "editable")
    root.innerHTML =
      '<div data-part="display"><span data-part="preview">A</span><button data-part="edit">Edit</button></div><div data-part="editor"><input data-part="control" value="A"></div><span data-part="status"></span>';
  else {
    root.dataset.value = "a";
    root.innerHTML =
      '<ol data-part="list"><li data-part="step" data-value="a"><button data-part="trigger">A</button></li><li data-part="step" data-value="b"><button data-part="trigger">B</button></li><li data-part="step" data-value="c"><button data-part="trigger">C</button></li></ol><section data-part="panel" data-value="a"><input required value="Valid"></section><section data-part="panel" data-value="b">B</section><section data-part="panel" data-value="c">C</section><button data-part="previous">Back</button><button data-part="next">Next</button><span data-part="status"></span>';
  }
  owner.document.body.append(root);
  return root;
}
function part(root: HTMLElement, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function details(root: HTMLElement): HTMLDetailsElement {
  return root.tagName === "DETAILS"
    ? (root as HTMLDetailsElement)
    : required(root.querySelector("details"));
}
function input(root: HTMLElement): HTMLInputElement {
  return required(root.querySelector("input"));
}
function set(ui: UI, kind: Kind, root: HTMLElement, newer = false, selector = false) {
  const target = selector ? "#sample" : root;
  if (kind === "editable") ui.editable.set(target, newer ? "C" : "B");
  else if (kind === "stepper") ui.stepper.go(target, newer ? "c" : "b");
  else
    ui[kind][newer ? "close" : "open"](
      selector ? (kind === "accordion" ? "#item-a" : "#sample") : details(root),
    );
}
function value(kind: Kind, root: HTMLElement): unknown {
  return kind === "collapsible" || kind === "accordion" ? details(root).open : root.dataset.value;
}
function expected(kind: Kind, newer = false): unknown {
  return kind === "editable"
    ? newer
      ? "C"
      : "B"
    : kind === "stepper"
      ? newer
        ? "c"
        : "b"
      : !newer;
}
function before(kind: Kind) {
  return `jquery-star:${kind}:${kind === "collapsible" || kind === "accordion" ? "before-open" : "before-change"}`;
}
function changed(kind: Kind) {
  return `jquery-star:${kind}:${kind === "collapsible" || kind === "accordion" ? "open" : "change"}`;
}
function binding(kind: Kind, root: HTMLElement) {
  return part(root, kind === "editable" ? "control" : kind === "stepper" ? "list" : "trigger");
}
function native(kind: Kind, root: HTMLElement, owner: Window = window) {
  if (kind === "editable") {
    input(root).value = "B";
    input(root).dispatchEvent(
      new (owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        bubbles: true,
        key: "Enter",
      }),
    );
  } else part(root, kind === "stepper" ? "next" : "trigger").click();
}

describe.each(["collapsible", "accordion", "editable", "stepper"] as const)(
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
      expect(value(kind, root)).toEqual(expected(kind));
      if (kind === "stepper") {
        native(kind, root, owner);
        expect(value(kind, root)).toBe("c");
      }
    });
    it.each([false, true])("accepts foreign targets with selector=%s", (selector) => {
      const { ui, owner } = install(realm());
      const root = fixture(kind, owner);
      ui.enhance(root);
      set(ui, kind, root, false, selector);
      expect(value(kind, root)).toEqual(expected(kind));
    });
    it("automatically enhances a foreign document", async () => {
      const { ui, owner, star } = install(realm());
      await star.whenEnhanced();
      const root = fixture(kind, owner);
      await star.whenEnhanced();
      expect(kind === "accordion" ? details(root).dataset.state : root.dataset.state).toBeTruthy();
      set(ui, kind, root);
      expect(value(kind, root)).toEqual(expected(kind));
    });
    it.each(["enhance", "facade"] as const)(
      "reacquires adoption through %s before source disposal",
      (mode) => {
        const source = install();
        const destination = install(realm());
        const root = fixture(kind);
        source.ui.enhance(root);
        if (kind === "editable") source.ui.editable.edit(root);
        destination.owner.document.body.append(destination.owner.document.adoptNode(root));
        expect(() => set(source.ui, kind, root)).toThrow("unavailable");
        if (mode === "enhance") destination.ui.enhance(root);
        else if (kind === "editable") destination.ui.editable.value(root);
        else if (kind === "stepper") destination.ui.stepper.value(root);
        else destination.ui[kind].close(details(root));
        source.star.dispose();
        if (kind === "collapsible" || kind === "accordion") {
          const canceled = vi.fn((event: Event) => event.preventDefault());
          root.addEventListener(before(kind), canceled, { once: true });
          native(kind, root, destination.owner);
          expect(canceled).toHaveBeenCalledOnce();
          expect(details(root).open).toBe(false);
        }
        native(kind, root, destination.owner);
        expect(value(kind, root)).toEqual(expected(kind));
      },
    );
    it("runs a private action inside a foreign installation", () => {
      const { ui, jquery, owner } = install(realm());
      const root = fixture(kind, owner);
      const button = owner.document.createElement("button");
      button.setAttribute(
        "data-on:click",
        kind === "editable"
          ? "@ui.editable.edit"
          : kind === "stepper"
            ? "@ui.stepper.go('b')"
            : `@ui.${kind}.open`,
      );
      (kind === "accordion" ? details(root) : root).append(button);
      jquery(root).star();
      button.click();
      if (kind === "editable") expect(ui.editable.editing(root)).toBe(true);
      else expect(value(kind, root)).toEqual(expected(kind));
    });
    it("emits component events from the destination window", () => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      const events: Event[] = [];
      root.addEventListener(changed(kind), (event) => events.push(event));
      set(destination.ui, kind, root);
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
    });
    it("retains exact bindings through unchanged enhancement", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      const target = binding(kind, root);
      const add = vi.spyOn(target, "addEventListener");
      const remove = vi.spyOn(target, "removeEventListener");
      ui.enhance(root);
      ui.enhance(root);
      expect(add).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
    it("keeps a newer operation requested during the before event", () => {
      const { ui } = install();
      const root = fixture(kind);
      ui.enhance(root);
      root.addEventListener(before(kind), () => set(ui, kind, root, true), { once: true });
      set(ui, kind, root);
      expect(value(kind, root)).toEqual(expected(kind, true));
    });
    it.each(["adopt", "replace"] as const)("stops a before-event continuation after %s", (mode) => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      const prior = value(kind, root);
      const events = vi.fn();
      root.addEventListener(changed(kind), events);
      root.addEventListener(
        before(kind),
        () => {
          if (mode === "adopt")
            destination.owner.document.body.append(destination.owner.document.adoptNode(root));
          else {
            const old = part(
              root,
              kind === "editable" ? "preview" : kind === "stepper" ? "panel" : "content",
            );
            old.replaceWith(old.cloneNode(true));
          }
        },
        { once: true },
      );
      set(source.ui, kind, root);
      expect(value(kind, root)).toEqual(prior);
      expect(events).not.toHaveBeenCalled();
    });
    it("releases native listeners when registration throws after adding", () => {
      const { ui } = install();
      const root = fixture(kind);
      const target = binding(kind, root);
      const add = target.addEventListener.bind(target);
      const remove = vi.spyOn(target, "removeEventListener");
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("native setup failed");
      });
      expect(() => ui.enhance(root)).toThrow("native setup failed");
      expect(remove).toHaveBeenCalled();
      vi.restoreAllMocks();
      ui.enhance(root);
      set(ui, kind, root);
      expect(value(kind, root)).toEqual(expected(kind));
    });
    it("releases a listener returned after disposal", () => {
      const { ui, star } = install();
      const root = fixture(kind);
      const target = binding(kind, root);
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
    it("preserves destination ownership created inside old cleanup", () => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      const target = binding(kind, root);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, "removeEventListener").mockImplementationOnce((...args) => {
        remove(...args);
        destination.ui.enhance(root);
      });
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      destination.ui.enhance(root);
      source.star.dispose();
      if (kind === "editable") destination.ui.editable.edit(root);
      const called = vi.fn();
      root.addEventListener(before(kind), called);
      native(kind, root, destination.owner);
      expect(called).toHaveBeenCalledOnce();
      expect(value(kind, root)).toEqual(expected(kind));
    });
  },
);
it.each(["collapsible", "accordion", "stepper"] as const)(
  "%s sweeps later listeners when removal throws",
  (kind) => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const target = binding(kind, root);
    const remove = target.removeEventListener.bind(target);
    let count = 0;
    vi.spyOn(target, "removeEventListener").mockImplementation((...args) => {
      remove(...args);
      count += 1;
      if (count === 1) throw new Error("native removal failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(count).toBeGreaterThan(1);
  },
);
it.each(["collapsible", "accordion"] as const)(
  "%s retains a pending native toggle notification through enhancement",
  async (kind) => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const events = vi.fn();
    root.addEventListener(changed(kind), events);
    part(root, "trigger").click();
    ui.enhance(root);
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(details(root).open).toBe(true);
    expect(events).toHaveBeenCalledOnce();
  },
);
it("Accordion does not close siblings when a summary's native link is clicked", () => {
  const { ui } = install();
  const root = fixture("accordion");
  ui.enhance(root);
  ui.accordion.open(details(root));
  const second = required(root.querySelectorAll("details")[1]);
  const link = document.createElement("a");
  link.href = "#content";
  link.textContent = "Link";
  required(second.querySelector("summary")).append(link);
  const events = vi.fn();
  root.addEventListener("jquery-star:accordion:before-open", events);
  root.addEventListener("click", (event) => event.preventDefault(), { once: true });
  link.click();
  expect(details(root).open).toBe(true);
  expect(events).not.toHaveBeenCalled();
});
it("Accordion stops an outer request superseded by a sibling close callback", () => {
  const { ui } = install();
  const root = fixture("accordion");
  ui.enhance(root);
  const items = root.querySelectorAll("details");
  const first = required(items[0]);
  const second = required(items[1]);
  const third = required(items[2]);
  ui.accordion.open(first);
  first.addEventListener("jquery-star:accordion:before-close", () => ui.accordion.open(third), {
    once: true,
  });
  ui.accordion.open(second);
  expect(third.open).toBe(true);
  expect(second.open).toBe(false);
});
it.each([false, true])(
  "Editable retains committed and draft values across adoption with disposal first=%s",
  (disposedFirst) => {
    const source = install();
    const destination = install(realm());
    const root = fixture("editable");
    source.ui.enhance(root);
    source.ui.editable.edit(root);
    input(root).value = "Draft";
    input(root).setSelectionRange(1, 3);
    if (disposedFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    expect(destination.ui.editable.value(root)).toBe("A");
    expect(input(root).value).toBe("Draft");
    expect(input(root).selectionStart).toBe(1);
    expect(input(root).selectionEnd).toBe(3);
    destination.ui.editable.cancel(root);
    expect(input(root).value).toBe("A");
  },
);
it("Editable preserves IME composition when Enter is pressed", () => {
  const { ui } = install();
  const root = fixture("editable");
  ui.enhance(root);
  ui.editable.edit(root);
  input(root).value = "Draft";
  const event = new KeyboardEvent("keydown", { key: "Enter", isComposing: true, cancelable: true });
  input(root).dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(ui.editable.editing(root)).toBe(true);
  expect(ui.editable.value(root)).toBe("A");
});
it("Editable stops stale custom notifications after a newer native change callback", () => {
  const { ui } = install();
  const root = fixture("editable");
  ui.enhance(root);
  const values: string[] = [];
  root.addEventListener("jquery-star:editable:change", (event) =>
    values.push((event as CustomEvent<{ value: string }>).detail.value),
  );
  input(root).addEventListener("change", () => ui.editable.set(root, "C"), { once: true });
  ui.editable.set(root, "B");
  expect(ui.editable.value(root)).toBe("C");
  expect(values).toEqual(["C"]);
});
it("Editable keeps focus in an editor reopened by its change callback", () => {
  const { ui } = install();
  const root = fixture("editable");
  ui.enhance(root);
  ui.editable.edit(root);
  input(root).value = "B";
  root.addEventListener("jquery-star:editable:change", () => ui.editable.edit(root), {
    once: true,
  });
  ui.editable.commit(root);
  expect(ui.editable.editing(root)).toBe(true);
  expect(document.activeElement).toBe(input(root));
});
it.each([false, true])(
  "Stepper preserves completed state across adoption with disposal first=%s",
  (disposedFirst) => {
    const source = install();
    const destination = install(realm());
    const root = fixture("stepper");
    source.ui.enhance(root);
    source.ui.stepper.go(root, "c");
    source.ui.stepper.next(root);
    if (disposedFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    expect(root.dataset.state).toBe("complete");
    expect(destination.ui.stepper.value(root)).toBe("c");
    expect(part(root, "next").hasAttribute("disabled")).toBe(true);
  },
);
it("Stepper stops completion when before-complete changes the current step", () => {
  const { ui } = install();
  const root = fixture("stepper");
  ui.enhance(root);
  ui.stepper.go(root, "c");
  const complete = vi.fn();
  root.addEventListener("jquery-star:stepper:complete", complete);
  root.addEventListener("jquery-star:stepper:before-complete", () => ui.stepper.go(root, "a"), {
    once: true,
  });
  ui.stepper.next(root);
  expect(ui.stepper.value(root)).toBe("a");
  expect(root.dataset.state).toBe("active");
  expect(complete).not.toHaveBeenCalled();
});
it("Stepper stops native validation continuation after newer work", () => {
  const { ui } = install();
  const root = fixture("stepper");
  root.dataset.linear = "";
  ui.enhance(root);
  input(root).value = "";
  const invalid = vi.fn();
  root.addEventListener("jquery-star:stepper:invalid", invalid);
  input(root).addEventListener(
    "invalid",
    () => {
      root.dataset.linear = "false";
      ui.stepper.go(root, "c");
    },
    { once: true },
  );
  ui.stepper.next(root);
  expect(ui.stepper.value(root)).toBe("c");
  expect(invalid).not.toHaveBeenCalled();
  expect(part(root, "step").dataset.error).toBeUndefined();
});
it("Accordion preserves siblings when a later native click listener cancels", () => {
  const { ui } = install();
  const root = fixture("accordion");
  ui.enhance(root);
  const first = details(root);
  const second = required(root.querySelectorAll("details")[1]);
  ui.accordion.open(first);
  root.addEventListener("click", (event) => event.preventDefault(), { once: true });
  required(second.querySelector("summary")).click();
  expect(first.open).toBe(true);
  expect(second.open).toBe(false);
});
it("Accordion does not overwrite a third item opened by a close notification", () => {
  const { ui } = install();
  const root = fixture("accordion");
  ui.enhance(root);
  const first = details(root);
  const second = required(root.querySelectorAll("details")[1]);
  const third = required(root.querySelectorAll("details")[2]);
  ui.accordion.open(first);
  first.addEventListener("jquery-star:accordion:close", () => ui.accordion.open(third), {
    once: true,
  });
  ui.accordion.open(second);
  expect(third.open).toBe(true);
  expect(second.open).toBe(false);
});
it("Editable stops commit when its before-change callback disables the input", () => {
  const { ui } = install();
  const root = fixture("editable");
  ui.enhance(root);
  ui.editable.edit(root);
  input(root).value = "Draft";
  root.addEventListener(
    "jquery-star:editable:before-change",
    () => {
      input(root).disabled = true;
    },
    { once: true },
  );
  ui.editable.commit(root);
  expect(ui.editable.value(root)).toBe("A");
  expect(ui.editable.editing(root)).toBe(true);
});
it("Stepper does not enter a later panel when before-change invalidates the active input", () => {
  const { ui } = install();
  const root = fixture("stepper");
  root.dataset.linear = "";
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:stepper:before-change",
    () => {
      input(root).value = "";
    },
    { once: true },
  );
  ui.stepper.next(root);
  expect(ui.stepper.value(root)).toBe("a");
  expect(part(root, "step").dataset.completed).toBe("false");
});
it.each([false, true])("Editable retains native multiline Enter after adoption=%s", (adopted) => {
  const source = install();
  const destination = install(realm());
  const root = fixture("editable", adopted ? window : destination.owner);
  const textarea = root.ownerDocument.createElement("textarea");
  textarea.dataset.part = "control";
  textarea.value = "A";
  input(root).replaceWith(textarea);
  if (adopted) {
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  }
  destination.ui.enhance(root);
  source.star.dispose();
  destination.ui.editable.edit(root);
  textarea.value = "Draft\nLine";
  const plain = new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
    key: "Enter",
    cancelable: true,
  });
  textarea.dispatchEvent(plain);
  expect(plain.defaultPrevented).toBe(false);
  expect(destination.ui.editable.editing(root)).toBe(true);
  textarea.dispatchEvent(
    new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
    }),
  );
  expect(destination.ui.editable.value(root)).toBe("Draft\nLine");
});
it("Stepper retains roving focus and avoids duplicate completion on unchanged enhancement", () => {
  const { ui } = install();
  const root = fixture("stepper");
  ui.enhance(root);
  const first = part(root, "trigger");
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  const second = required(root.querySelectorAll<HTMLElement>('[data-part="trigger"]')[1]);
  ui.enhance(root);
  expect(document.activeElement).toBe(second);
  expect(second.tabIndex).toBe(0);
  expect(ui.stepper.value(root)).toBe("a");
  ui.stepper.go(root, "c");
  const complete = vi.fn();
  root.addEventListener("jquery-star:stepper:complete", complete);
  ui.stepper.next(root);
  ui.enhance(root);
  ui.stepper.next(root);
  expect(complete).toHaveBeenCalledOnce();
});

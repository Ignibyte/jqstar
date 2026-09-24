import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing Toast fixture");
  return value;
}
function realm(): Window & typeof globalThis {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow) as Window & typeof globalThis;
}
function install(owner: Window & typeof globalThis = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  stars.push(jquery.star);
  return { owner, jquery, star: jquery.star, ui: jquery.star.use(uiPlugin) };
}
function fixture(owner: Window & typeof globalThis = window) {
  const viewport = owner.document.createElement("div");
  viewport.dataset.jqs = "toast-viewport";
  const root = owner.document.createElement("div");
  root.id = "toast-document";
  root.className = "toast-target";
  root.dataset.jqs = "toast";
  root.dataset.duration = "0";
  root.innerHTML =
    '<p data-part="title">Saved</p><p data-part="description">Current version</p><button data-part="close">Close</button><button data-part="action" data-alt-text="Open history">Undo</button>';
  viewport.append(root);
  owner.document.body.append(viewport);
  return {
    root,
    viewport,
    close: required(root.querySelector<HTMLButtonElement>('[data-part="close"]')),
    action: required(root.querySelector<HTMLButtonElement>('[data-part="action"]')),
    title: required(root.querySelector<HTMLElement>('[data-part="title"]')),
  };
}
function key(owner: Window & typeof globalThis, target: EventTarget, value: string): void {
  target.dispatchEvent(
    new owner.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
  );
}
function click(owner: Window & typeof globalThis, target: EventTarget): void {
  target.dispatchEvent(new owner.MouseEvent("click", { bubbles: true, cancelable: true }));
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe.each(["local", "foreign"])("Toast %s document", (scope) => {
  function setup() {
    const installed = install(scope === "local" ? window : realm());
    return { ...installed, ...fixture(installed.owner) };
  }
  it("uses owning-window native events and separate announcements", () => {
    const { ui, root, owner, viewport } = setup();
    const opened: Event[] = [];
    root.addEventListener("jquery-star:toast:open", (event) => opened.push(event));
    ui.enhance(root);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toBeInstanceOf(owner.CustomEvent);
    const announcer = required(viewport.querySelector('[data-part="announcer"]'));
    expect(announcer.textContent).toBe("Saved. Current version. Open history");
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(false);
    expect(announcer.isConnected).toBe(true);
  });
  it.each(["close", "action", "escape"])("honors canceled native %s", (mode) => {
    const { ui, root, close, action, owner } = setup();
    const target = mode === "close" ? close : mode === "action" ? action : root;
    target.addEventListener(mode === "escape" ? "keydown" : "click", (event) =>
      event.preventDefault(),
    );
    ui.enhance(root);
    if (mode === "escape") key(owner, target, "Escape");
    else click(owner, target);
    expect(root.isConnected).toBe(true);
    expect(root.dataset.state).toBe("open");
  });
  it("honors canceled F8 before moving focus", () => {
    const { ui, owner, viewport, root } = setup();
    ui.enhance(root);
    const focus = vi.spyOn(viewport, "focus");
    owner.document.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    key(owner, owner.document, "F8");
    expect(focus).not.toHaveBeenCalled();
  });
  it.each(["inert", "data-disabled", "aria-disabled"])(
    "honors %s in native and named dismissal",
    async (constraint) => {
      const { ui, owner, jquery, root, close } = setup();
      const app = required(jquery(root).star().star("instance"));
      root.setAttribute(constraint, "true");
      click(owner, close);
      await app.run("ui.toast.dismiss");
      expect(root.isConnected).toBe(true);
      ui.toast.dismiss(root);
      expect(root.isConnected).toBe(false);
    },
  );
  it("leaves a disabled viewport out of F8 focus recovery", () => {
    const { ui, owner, viewport, root } = setup();
    const other = fixture(owner);
    ui.enhance(owner.document);
    viewport.setAttribute("inert", "");
    key(owner, owner.document, "F8");
    expect(owner.document.activeElement).toBe(other.viewport);
    expect(root.dataset.state).toBe("open");
  });
  it.each(["implicit", "id", "class", "element"])(
    "resolves %s actions on the application root",
    async (mode) => {
      const { jquery, root } = setup();
      const app = required(jquery(root).star().star("instance"));
      const target = mode === "id" ? "#toast-document" : mode === "class" ? ".toast-target" : root;
      await app.run("ui.toast.dismiss", { args: mode === "implicit" ? [] : [target] });
      expect(root.isConnected).toBe(false);
    },
  );
  it("accepts an explicit element target from a surrounding application", async () => {
    const { jquery, root, viewport } = setup();
    const app = required(jquery(viewport).star().star("instance"));
    await app.run("ui.toast.dismiss", { args: [root] });
    expect(root.isConnected).toBe(false);
  });
  it("rejects an old close control before replacement enhancement", () => {
    const { ui, root, close } = setup();
    ui.enhance(root);
    close.replaceWith(close.cloneNode(true));
    close.click();
    expect(root.isConnected).toBe(true);
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(false);
  });
  it.each(["close", "title", "viewport", "state"])(
    "stops dismissal after a before-dismiss %s change",
    (part) => {
      const { ui, root, close, title, viewport, owner } = setup();
      ui.enhance(root);
      const dismissed = vi.fn();
      root.addEventListener("jquery-star:toast:dismiss", dismissed);
      root.addEventListener(
        "jquery-star:toast:before-dismiss",
        () => {
          if (part === "close") close.replaceWith(close.cloneNode(true));
          else if (part === "title") title.textContent = "Patched notification";
          else if (part === "state") root.dataset.state = "patched";
          else {
            const replacement = owner.document.createElement("div");
            replacement.dataset.jqs = "toast-viewport";
            viewport.after(replacement);
            replacement.append(root);
          }
        },
        { once: true },
      );
      ui.toast.dismiss(root);
      expect(root.isConnected).toBe(true);
      expect(dismissed).not.toHaveBeenCalled();
      if (part === "state") expect(root.dataset.state).toBe("patched");
    },
  );
  it("retains dismissal through unchanged enhancement in before-dismiss", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    root.addEventListener("jquery-star:toast:before-dismiss", () => ui.enhance(root), {
      once: true,
    });
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(false);
  });
  it("keeps newer nested dismissal singular", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    const dismissed = vi.fn();
    root.addEventListener("jquery-star:toast:dismiss", dismissed);
    root.addEventListener("jquery-star:toast:before-dismiss", () => ui.toast.dismiss(root), {
      once: true,
    });
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(false);
    expect(dismissed).toHaveBeenCalledOnce();
  });
  it.each(["close", "action", "escape"])("ignores nested-controller %s interactions", (part) => {
    const { ui, root, owner } = setup();
    const nested = owner.document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = `<button data-part="${part === "escape" ? "close" : part}">Nested</button>`;
    root.append(nested);
    ui.enhance(root);
    const button = required(nested.querySelector("button"));
    if (part === "escape") key(owner, button, "Escape");
    else button.click();
    expect(root.isConnected).toBe(true);
  });
  it("stops initial setup after a native attribute write disposes the owner", () => {
    const { ui, root, star } = setup();
    const original = root.setAttribute.bind(root);
    let snapshot = "";
    vi.spyOn(root, "setAttribute").mockImplementationOnce((...args) => {
      star.dispose();
      original(...args);
      snapshot = root.outerHTML;
    });
    ui.enhance(root);
    expect(root.outerHTML).toBe(snapshot);
  });
  it("stops generated-label writes when the first label write disposes the owner", () => {
    const { ui, root, star } = setup();
    const original = root.setAttribute.bind(root);
    let snapshot = "";
    vi.spyOn(root, "setAttribute").mockImplementation((name, value) => {
      original(name, value);
      if (name === "aria-labelledby" && !snapshot) {
        star.dispose();
        snapshot = root.outerHTML;
      }
    });
    ui.enhance(root);
    expect(snapshot).not.toBe("");
    expect(root.outerHTML).toBe(snapshot);
  });
  it("does not append after an options getter disposes the owner", () => {
    const { ui, viewport, star } = setup();
    ui.enhance(viewport);
    const append = vi.spyOn(viewport, "append");
    ui.toast.show({
      viewport,
      get description() {
        star.dispose();
        return "Late";
      },
    });
    expect(append).not.toHaveBeenCalled();
  });
  it("does not revive a pending show after its options getter clears the viewport", () => {
    const { ui, viewport } = setup();
    ui.enhance(viewport);
    const shown = ui.toast.show({
      viewport,
      get description() {
        ui.toast.clear();
        return "Old";
      },
    });
    expect(shown.isConnected).toBe(false);
    expect(viewport.querySelector('[data-jqs="toast"]')).toBeNull();
  });
  it("preserves a replacement acquired while earlier listener cleanup reenters", () => {
    const { ui, root, close } = setup();
    ui.enhance(root);
    const replacement = close.cloneNode(true) as HTMLButtonElement;
    close.replaceWith(replacement);
    const remove = root.removeEventListener.bind(root);
    vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
      ui.enhance(root);
      remove(...args);
    });
    ui.enhance(root);
    const dismissed = vi.fn();
    root.addEventListener("jquery-star:toast:dismiss", dismissed);
    replacement.click();
    expect(dismissed).toHaveBeenCalledOnce();
  });
  it("preserves authored names while refreshing current labels", () => {
    const { ui, root, title } = setup();
    ui.enhance(root);
    root.setAttribute("aria-label", "Authored notification");
    title.replaceWith(title.cloneNode(true));
    ui.enhance(root);
    expect(root.getAttribute("aria-label")).toBe("Authored notification");
    expect(root.hasAttribute("aria-labelledby")).toBe(false);
  });
  it("rejects invalid detached action markup before attaching it", () => {
    const { ui, owner, viewport } = setup();
    const invalid = owner.document.createElement("div");
    invalid.dataset.jqs = "toast";
    invalid.innerHTML = '<button data-part="action">Undo</button>';
    const before = viewport.outerHTML;
    expect(() => ui.enhance(invalid)).toThrow(/data-alt-text/);
    expect(invalid.parentNode).toBeNull();
    expect(viewport.outerHTML).toBe(before);
  });
  it.each(["native", "jquery"])("honors canceled %s named actions", async (kind) => {
    const { jquery, ui, root, viewport, owner } = setup();
    const app = required(jquery(viewport).star().star("instance"));
    const event =
      kind === "native"
        ? new owner.MouseEvent("click", { cancelable: true })
        : jquery.Event("click");
    event.preventDefault();
    await app.run("ui.toast.show", { args: ["Canceled"], event });
    await app.run("ui.toast.dismiss", { args: [root], event });
    await app.run("ui.toast.clear", { event });
    expect(viewport.querySelectorAll('[data-jqs="toast"]')).toHaveLength(1);
    expect(root.isConnected).toBe(true);
    ui.toast.clear();
    expect(root.isConnected).toBe(false);
  });
  it("keeps focus pause while focus moves between its own controls", () => {
    const { ui, root, owner, close, action } = setup();
    root.dataset.duration = "100";
    ui.enhance(root);
    close.focus();
    const schedule = vi.spyOn(owner, "setTimeout");
    close.dispatchEvent(new owner.FocusEvent("focusout", { bubbles: true, relatedTarget: action }));
    expect(schedule).not.toHaveBeenCalled();
    expect(root.dataset.paused).toBe("true");
  });
  it("stops removal when listener cleanup moves the toast", () => {
    const { ui, root, owner } = setup();
    ui.enhance(root);
    const destination = fixture(owner).viewport;
    const remove = root.removeEventListener.bind(root);
    vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
      destination.append(root);
      remove(...args);
    });
    const dismissed = vi.fn();
    root.addEventListener("jquery-star:toast:dismiss", dismissed);
    ui.toast.dismiss(root);
    expect(root.parentNode).toBe(destination);
    expect(dismissed).not.toHaveBeenCalled();
  });
  it("does not recover focus into a different document after cleanup", () => {
    const { ui, root, owner, close } = setup();
    const next = fixture(owner);
    const destination = realm();
    ui.enhance(owner.document);
    close.focus();
    const focus = vi.spyOn(next.close, "focus");
    const remove = root.removeEventListener.bind(root);
    vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
      destination.document.body.append(destination.document.adoptNode(next.viewport));
      remove(...args);
    });
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });
  it("rechecks native constraints after before-dismiss", () => {
    const { ui, root, close } = setup();
    ui.enhance(root);
    root.addEventListener("jquery-star:toast:before-dismiss", () => (close.disabled = true), {
      once: true,
    });
    close.click();
    expect(root.dataset.state).toBe("open");
    expect(root.isConnected).toBe(true);
  });
  it("stops removal when the state write replaces a current part", () => {
    const { ui, root, close } = setup();
    ui.enhance(root);
    const attribute = root.setAttribute.bind(root);
    vi.spyOn(root, "setAttribute").mockImplementation((name, value) => {
      attribute(name, value);
      if (name === "data-state" && value === "closed") close.replaceWith(close.cloneNode(true));
    });
    const dismissed = vi.fn();
    root.addEventListener("jquery-star:toast:dismiss", dismissed);
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(true);
    expect(dismissed).not.toHaveBeenCalled();
  });
  it("keeps programmatic creation in the first viewport even when inert", () => {
    const { ui, viewport, owner } = setup();
    fixture(owner);
    viewport.setAttribute("inert", "");
    const shown = ui.toast.show({ description: "Programmatic", duration: false });
    expect(shown.parentNode).toBe(viewport);
  });
  it("keeps constrained targets during a named clear but permits a direct clear", async () => {
    const { ui, root, viewport, owner, jquery } = setup();
    const other = fixture(owner);
    const app = required(jquery(viewport).star().star("instance"));
    ui.enhance(viewport);
    ui.enhance(other.viewport);
    expect(root.dataset.state).toBe("open");
    root.setAttribute("inert", "");
    await app.run("ui.toast.clear");
    expect(root.isConnected).toBe(true);
    expect(other.root.isConnected).toBe(false);
    ui.toast.clear();
    expect(root.isConnected).toBe(false);
  });
  it("does not create a named toast inside an inert viewport", async () => {
    const { ui, viewport, owner, jquery } = setup();
    const app = required(jquery(owner.document.body).star().star("instance"));
    viewport.setAttribute("inert", "");
    await app.run("ui.toast.show", { args: [{ viewport, description: "Named" }] });
    expect(viewport.querySelectorAll('[data-jqs="toast"]')).toHaveLength(1);
    const created = ui.toast.show({ viewport, description: "Direct", duration: false });
    expect(created.parentNode).toBe(viewport);
  });
});

it.each([false, true])(
  "Toast adoption retains native controls with source disposed first=%s",
  (disposeFirst) => {
    const source = install(realm()),
      destination = install(realm());
    const { root, viewport, close } = fixture(source.owner);
    source.ui.enhance(root);
    if (disposeFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(viewport));
    const opened: Event[] = [];
    root.addEventListener("jquery-star:toast:open", (event) => opened.push(event));
    destination.ui.enhance(viewport);
    if (!disposeFirst) source.star.dispose();
    expect(root.ownerDocument).toBe(destination.owner.document);
    expect(root.querySelector('[data-part="close"]')).toBe(close);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toBeInstanceOf(destination.owner.CustomEvent);
    expect(() => source.ui.toast.dismiss(root)).toThrow();
    close.click();
    expect(root.isConnected).toBe(false);
  },
);

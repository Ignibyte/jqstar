import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
type UI = ReturnType<typeof uiPlugin.install>;
type Kind = "popover" | "tooltip" | "hover-card" | "menu" | "context-menu" | "menubar";
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing floating fixture part");
  return value;
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow);
}
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { owner, jquery, star, ui: star.use(uiPlugin) };
}
function fixture(kind: Kind = "popover", owner: Window = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "floating";
  root.dataset.delay = "0";
  root.dataset.closeDelay = "0";
  const parts =
    '<button type="button" data-jqs="button" data-part="trigger">Open</button><div data-part="content">' +
    (kind === "tooltip"
      ? "Helpful description"
      : '<h2 data-part="title">Title</h2><button type="button" data-part="item" data-value="a">Alpha</button><button type="button" data-part="item" data-value="b">Beta</button>') +
    "</div>";
  root.innerHTML =
    kind === "menubar"
      ? '<div data-part="menu" data-jqs="menu" data-value="first">' + parts + "</div>"
      : parts;
  owner.document.body.append(root);
  return {
    root,
    trigger: required(root.querySelector<HTMLElement>('[data-part="trigger"]')),
    content: required(root.querySelector<HTMLElement>('[data-part="content"]')),
  };
}
function open(ui: UI, kind: Kind, root: HTMLElement) {
  if (kind === "context-menu") return ui.contextMenu.open(root, 10, 20);
  if (kind === "hover-card") return ui.hoverCard.open(root);
  if (kind === "menubar") return ui.menubar.open(root, "first");
  return ui[kind].open(root);
}
function close(ui: UI, kind: Kind, root: HTMLElement) {
  if (kind === "context-menu") return ui.contextMenu.close(root);
  if (kind === "hover-card") return ui.hoverCard.close(root);
  return ui[kind].close(root);
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
  vi.useRealTimers();
});
describe.each(["popover", "tooltip", "hover-card", "menu", "context-menu", "menubar"] as const)(
  "%s document ownership",
  (kind) => {
    it("accepts its foreign document facade", () => {
      const { owner, ui } = install(realm());
      const { root, content } = fixture(kind, owner);
      ui.enhance(root);
      expect(() => open(ui, kind, root)).not.toThrow();
      expect(content.hidden).toBe(false);
    });
    it("keeps native trigger interaction after adoption and source disposal", async () => {
      const source = install();
      const destination = install(realm());
      const { root, trigger, content } = fixture(kind);
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      destination.ui.enhance(root);
      source.star.dispose();
      const constructors = destination.owner as Window & typeof globalThis;
      if (kind === "tooltip" || kind === "hover-card")
        trigger.dispatchEvent(new constructors.Event("pointerenter"));
      else if (kind === "context-menu")
        trigger.dispatchEvent(
          new constructors.MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: 10,
            clientY: 20,
          }),
        );
      else trigger.click();
      await new Promise((resolve) => destination.owner.setTimeout(resolve, 10));
      expect(content.hidden).toBe(false);
      expect(root.dataset.state).toBe("open");
    });
    it("stops an older open after before-open requests close", () => {
      const { ui } = install();
      const { root, content } = fixture(kind);
      try {
        ui.enhance(root);
        const eventKind = kind === "menubar" ? "menu" : kind;
        root.addEventListener(`jquery-star:${eventKind}:before-open`, () => close(ui, kind, root), {
          once: true,
        });
        const opened = vi.fn();
        root.addEventListener(`jquery-star:${eventKind}:open`, opened);
        open(ui, kind, root);
        expect(root.dataset.state).toBe("closed");
        expect(content.hidden).toBe(true);
        expect(opened).not.toHaveBeenCalled();
      } finally {
        root.remove();
      }
    });
    it("releases a listener when native registration succeeds then throws", () => {
      const { ui } = install();
      const { root, trigger } = fixture(kind);
      const target = kind === "menubar" ? root : trigger;
      const add = target.addEventListener.bind(target);
      const removed = vi.spyOn(target, "removeEventListener");
      let acquired: [string, EventListenerOrEventListenerObject] | undefined;
      const fault = vi
        .spyOn(target, "addEventListener")
        .mockImplementationOnce((type, listener, options) => {
          acquired = [type, listener];
          add(type, listener, options);
          throw new Error("register-after-side-effect");
        });
      try {
        expect(() => ui.enhance(root)).toThrow("register-after-side-effect");
        expect(removed).toHaveBeenCalledWith(...required(acquired));
      } finally {
        fault.mockRestore();
        root.remove();
      }
    });
  },
);

describe("Popover document and transition continuations", () => {
  it("honors an explicit initial-focus selector inside a composed controller", () => {
    const { ui } = install();
    const { root, content } = fixture();
    content.innerHTML =
      '<div data-jqs="native-test"><button id="composed-focus">Inside</button></div>';
    root.dataset.initialFocus = "#composed-focus";
    ui.popover.open(root);
    expect(document.activeElement).toBe(content.querySelector("button"));
  });
  it("automatically enhances a foreign document", async () => {
    const { owner, star } = install(realm());
    await star.whenEnhanced();
    const { root, trigger } = fixture("popover", owner);
    await star.whenEnhanced();
    trigger.click();
    expect(root.dataset.state).toBe("open");
  });
  it.each(["implicit", "selector", "element"] as const)(
    "runs its foreign %s private action",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const { root, trigger } = fixture("popover", owner);
      trigger.setAttribute(
        "data-on:click",
        mode === "selector" ? "@ui.popover.open('#floating')" : "@ui.popover.open",
      );
      const app = jquery(root).star();
      if (mode === "element") await app.star("instance")?.run("ui.popover.open", { args: [root] });
      else trigger.click();
      expect(root.dataset.state).toBe("open");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains open state and current focus through adopted %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, content } = fixture();
      root.dataset.initialFocus = '[data-value="b"]';
      source.ui.popover.open(root);
      const focused = required(content.querySelector<HTMLElement>('[data-value="b"]'));
      expect(document.activeElement).toBe(focused);
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      const opened = vi.fn();
      root.addEventListener("jquery-star:popover:open", opened);
      if (mode === "facade") destination.ui.popover.open(root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(root.dataset.state).toBe("open");
      expect(content.hidden).toBe(false);
      expect(destination.owner.document.activeElement).toBe(focused);
      expect(opened).not.toHaveBeenCalled();
      const events: Event[] = [];
      root.addEventListener("jquery-star:popover:close", (event) => events.push(event));
      destination.ui.popover.close(root);
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
    },
  );
  it("retains exact native listeners during unchanged enhancement", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    ui.popover.open(root);
    const added = vi.spyOn(trigger, "addEventListener");
    const removed = vi.spyOn(trigger, "removeEventListener");
    const focused = required(content.querySelector<HTMLElement>("button"));
    focused.focus();
    ui.enhance(root);
    ui.enhance(root);
    expect(added).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(focused);
  });
  it.each(["trigger", "content"] as const)("uses current %s parts through the facade", (name) => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    ui.enhance(root);
    const previous = name === "trigger" ? trigger : content;
    const replacement = previous.cloneNode(true) as HTMLElement;
    previous.replaceWith(replacement);
    ui.popover.open(root);
    expect(required(root.querySelector<HTMLElement>('[data-part="content"]')).hidden).toBe(false);
    ui.popover.close(root);
    previous.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(root.dataset.state).toBe("closed");
  });
  it("stops an older close when before-close requests an already-open state", () => {
    const { ui } = install();
    const { root, content } = fixture();
    ui.popover.open(root);
    root.addEventListener("jquery-star:popover:before-close", () => ui.popover.open(root), {
      once: true,
    });
    ui.popover.close(root);
    expect(content.hidden).toBe(false);
    expect(root.dataset.state).toBe("open");
  });
  it.each(["native", "root", "aria", "fieldset"] as const)(
    "rejects opening after before-open changes %s availability",
    (mode) => {
      const { ui } = install();
      const { root, trigger, content } = fixture();
      root.addEventListener(
        "jquery-star:popover:before-open",
        () => {
          if (mode === "native") trigger.setAttribute("disabled", "");
          else if (mode === "root") root.dataset.disabled = "";
          else if (mode === "aria") trigger.setAttribute("aria-disabled", "true");
          else {
            const fieldset = document.createElement("fieldset");
            fieldset.disabled = true;
            root.before(fieldset);
            fieldset.append(root);
          }
        },
        { once: true },
      );
      ui.popover.open(root);
      expect(content.hidden).toBe(true);
      expect(root.dataset.state).toBe("closed");
    },
  );
  it.each(["trigger", "content"] as const)("stops opening when before-open replaces %s", (name) => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    const previous = name === "trigger" ? trigger : content;
    const opened = vi.fn();
    root.addEventListener("jquery-star:popover:open", opened);
    root.addEventListener(
      "jquery-star:popover:before-open",
      () => previous.replaceWith(previous.cloneNode(true)),
      { once: true },
    );
    ui.popover.open(root);
    expect(opened).not.toHaveBeenCalled();
    expect(content.hidden).toBe(true);
  });
  it("does not resume geometry or initial focus after geometry closes the panel", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    root.dataset.initialFocus = "button";
    ui.enhance(root);
    const focus = vi.spyOn(required(content.querySelector<HTMLElement>("button")), "focus");
    vi.spyOn(trigger, "getBoundingClientRect").mockImplementationOnce(() => {
      ui.popover.close(root);
      return new DOMRect(10, 10, 30, 20);
    });
    const opened = vi.fn();
    root.addEventListener("jquery-star:popover:open", opened);
    ui.popover.open(root);
    expect(root.dataset.state).toBe("closed");
    expect(content.style.left).toBe("");
    expect(focus).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
  });
  it("stops the open notification when initial focus chooses close", () => {
    const { ui } = install();
    const { root, content } = fixture();
    root.dataset.initialFocus = "button";
    required(content.querySelector("button")).addEventListener(
      "focus",
      () => ui.popover.close(root),
      { once: true },
    );
    const opened = vi.fn();
    root.addEventListener("jquery-star:popover:open", opened);
    ui.popover.open(root);
    expect(content.hidden).toBe(true);
    expect(opened).not.toHaveBeenCalled();
  });
  it.each(["show", "hide"] as const)(
    "reconciles newer state after native %s returns",
    (operation) => {
      const { ui } = install();
      const { root, content } = fixture();
      let reenter = false;
      Object.assign(content, {
        showPopover() {
          if (reenter && operation === "show") {
            reenter = false;
            ui.popover.close(root);
          }
          content.hidden = false;
        },
        hidePopover() {
          if (reenter && operation === "hide") {
            reenter = false;
            ui.popover.open(root);
          }
          content.hidden = true;
        },
      });
      ui.enhance(root);
      if (operation === "hide") ui.popover.open(root);
      reenter = true;
      if (operation === "show") ui.popover.open(root);
      else ui.popover.close(root);
      expect(content.hidden).toBe(operation === "show");
      expect(root.dataset.state).toBe(operation === "show" ? "closed" : "open");
    },
  );
  it("releases a listener returned after acquisition disposes the owner", () => {
    const { ui, star } = install();
    const { root, trigger } = fixture();
    const add = trigger.addEventListener.bind(trigger);
    const removed = vi.spyOn(trigger, "removeEventListener");
    const fault = vi
      .spyOn(trigger, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        star.dispose();
        add(type, listener, options);
      });
    try {
      expect(() => ui.enhance(root)).toThrow();
      expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    } finally {
      fault.mockRestore();
      root.remove();
    }
  });
  it("sweeps all resources after a native cleanup failure", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture();
    ui.popover.open(root);
    const remove = trigger.removeEventListener.bind(trigger);
    const fault = vi
      .spyOn(trigger, "removeEventListener")
      .mockImplementationOnce((type, listener, options) => {
        remove(type, listener, options);
        throw new Error("cleanup failure");
      });
    const contentRemoved = vi.spyOn(content, "removeEventListener");
    try {
      expect(() => star.dispose()).toThrow();
      expect(contentRemoved).toHaveBeenCalled();
      expect(content.hidden).toBe(true);
    } finally {
      fault.mockRestore();
      stars.splice(stars.indexOf(star), 1);
      root.remove();
    }
  });
  it("keeps a newer close from listener acquisition", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    const add = trigger.addEventListener.bind(trigger);
    const fault = vi
      .spyOn(trigger, "addEventListener")
      .mockImplementationOnce((type, listener, options) => {
        add(type, listener, options);
        ui.popover.close(root);
      });
    try {
      ui.popover.open(root);
      expect(content.hidden).toBe(true);
      expect(root.dataset.state).toBe("closed");
    } finally {
      fault.mockRestore();
      root.remove();
    }
  });
  it("keeps a newer close from old listener cleanup", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    ui.enhance(root);
    trigger.replaceWith(trigger.cloneNode(true));
    const remove = trigger.removeEventListener.bind(trigger);
    const fault = vi
      .spyOn(trigger, "removeEventListener")
      .mockImplementationOnce((type, listener, options) => {
        remove(type, listener, options);
        ui.popover.close(root);
      });
    try {
      ui.popover.open(root);
      expect(content.hidden).toBe(true);
      expect(root.dataset.state).toBe("closed");
    } finally {
      fault.mockRestore();
      root.remove();
    }
  });
  it("honors canceled native clicks and Escape", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    trigger.addEventListener("click", (event) => event.preventDefault());
    ui.enhance(root);
    trigger.click();
    expect(content.hidden).toBe(true);
    ui.popover.open(root);
    root.addEventListener("keydown", (event) => event.preventDefault());
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    expect(content.hidden).toBe(false);
  });
  it("keeps nested titles and controls with their own controller", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    content.insertAdjacentHTML(
      "afterbegin",
      '<div data-jqs="native-test"><h2 data-part="title" id="nested-title">Nested</h2></div>',
    );
    trigger.innerHTML =
      '<span data-jqs="native-test"><span id="nested-target">Nested action</span></span>';
    ui.enhance(root);
    expect(content.getAttribute("aria-labelledby")).toBe("floating-title");
    required(trigger.querySelector("#nested-target")).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(content.hidden).toBe(true);
  });
  it("ignores canceled outside presses", () => {
    const { ui } = install();
    const { root, content } = fixture();
    ui.popover.open(root);
    const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    event.preventDefault();
    document.body.dispatchEvent(event);
    expect(content.hidden).toBe(false);
  });
});

describe("Popover retained focus and ownership", () => {
  it("does not restore focus that was explicitly blurred before adoption", () => {
    const source = install();
    const destination = install(realm());
    const { root, content } = fixture();
    root.dataset.initialFocus = "button";
    source.ui.popover.open(root);
    required(content.querySelector<HTMLButtonElement>("button")).blur();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    expect(destination.owner.document.activeElement).toBe(destination.owner.document.body);
    expect(content.hidden).toBe(false);
  });
  it("ignores an unavailable descendant of a native trigger", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    trigger.innerHTML = '<span aria-disabled="true">Unavailable</span>';
    ui.enhance(root);
    required(trigger.querySelector("span")).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(content.hidden).toBe(true);
  });
  it("keeps replacement ownership after old native hide returns", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture();
    let replace = false;
    Object.assign(content, {
      showPopover() {
        content.hidden = false;
      },
      hidePopover() {
        if (replace) {
          replace = false;
          ui.popover.open(root);
        }
        content.hidden = true;
      },
    });
    ui.popover.open(root);
    trigger.replaceWith(trigger.cloneNode(true));
    replace = true;
    ui.enhance(root);
    expect(root.dataset.state).toBe("open");
    expect(content.hidden).toBe(false);
    ui.popover.close(root);
    expect(content.hidden).toBe(true);
  });
});

it.each(["show", "hide"] as const)(
  "Popover settles state after a newer native %s no-op",
  (operation) => {
    const { ui } = install();
    const { root, content } = fixture();
    let reenter = false;
    Object.assign(content, {
      showPopover() {
        if (reenter && operation === "show") {
          reenter = false;
          ui.popover.open(root);
        }
        content.hidden = false;
      },
      hidePopover() {
        if (reenter && operation === "hide") {
          reenter = false;
          ui.popover.close(root);
        }
        content.hidden = true;
      },
    });
    ui.enhance(root);
    if (operation === "hide") ui.popover.open(root);
    reenter = true;
    if (operation === "show") ui.popover.open(root);
    else ui.popover.close(root);
    expect(root.dataset.state).toBe(operation === "show" ? "open" : "closed");
    expect(content.hidden).toBe(operation === "hide");
  },
);

describe("Tooltip document and delayed continuations", () => {
  it("automatically enhances its foreign document", async () => {
    const { owner, star } = install(realm());
    await star.whenEnhanced();
    const { root, trigger } = fixture("tooltip", owner);
    await star.whenEnhanced();
    trigger.dispatchEvent(new (owner as Window & typeof globalThis).Event("pointerenter"));
    await new Promise((resolve) => owner.setTimeout(resolve, 10));
    expect(root.dataset.state).toBe("open");
  });
  it.each(["implicit", "selector", "element"] as const)(
    "runs its foreign %s action",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const { root, trigger } = fixture("tooltip", owner);
      trigger.setAttribute(
        "data-on:click",
        mode === "selector" ? "@ui.tooltip.open('#floating')" : "@ui.tooltip.open",
      );
      const app = jquery(root).star();
      if (mode === "element") await app.star("instance")?.run("ui.tooltip.open", { args: [root] });
      else trigger.click();
      expect(root.dataset.state).toBe("open");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains open state without moving focus through adopted %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, content } = fixture("tooltip");
      source.ui.tooltip.open(root);
      const outside = destination.owner.document.createElement("button");
      destination.owner.document.body.append(outside);
      outside.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      const opened = vi.fn();
      root.addEventListener("jquery-star:tooltip:open", opened);
      if (mode === "facade") destination.ui.tooltip.open(root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(content.hidden).toBe(false);
      expect(root.dataset.state).toBe("open");
      expect(destination.owner.document.activeElement).toBe(outside);
      expect(opened).not.toHaveBeenCalled();
      const events: Event[] = [];
      root.addEventListener("jquery-star:tooltip:close", (event) => events.push(event));
      destination.ui.tooltip.close(root);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
    },
  );
  it.each(["trigger", "content"] as const)(
    "reacquires current %s parts through its facade",
    (name) => {
      const { ui } = install();
      const { root, trigger, content } = fixture("tooltip");
      ui.enhance(root);
      const previous = name === "trigger" ? trigger : content;
      const replacement = previous.cloneNode(true) as HTMLElement;
      previous.replaceWith(replacement);
      ui.tooltip.open(root);
      expect(required(root.querySelector<HTMLElement>('[data-part="content"]')).hidden).toBe(false);
      expect(
        required(root.querySelector('[data-part="trigger"]')).getAttribute("aria-describedby"),
      ).toBe(required(root.querySelector<HTMLElement>('[data-part="content"]')).id);
      ui.tooltip.close(root);
      previous.dispatchEvent(new Event("pointerenter"));
      expect(root.dataset.state).toBe("closed");
    },
  );
  it("keeps stable bindings and the original pending delay", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    root.dataset.delay = "100";
    ui.enhance(root);
    trigger.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(40);
    const add = vi.spyOn(trigger, "addEventListener");
    const remove = vi.spyOn(trigger, "removeEventListener");
    ui.enhance(root);
    ui.enhance(root);
    vi.advanceTimersByTime(59);
    expect(content.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(content.hidden).toBe(false);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "retains an opening deadline across adoption with source disposal first=%s",
    (disposedFirst) => {
      retainedFloatingDeadline("tooltip", false, disposedFirst);
    },
  );
  it.each([false, true])(
    "retains a closing deadline across adoption with source disposal first=%s",
    (disposedFirst) => {
      retainedFloatingDeadline("tooltip", true, disposedFirst);
    },
  );
  it("ignores a canceled timer callback after a replacement interaction", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.enhance(root);
    const callbacks: Array<() => void> = [];
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      callbacks.push(callback as () => void);
      return callbacks.length;
    });
    vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    trigger.dispatchEvent(new Event("pointerenter"));
    ui.tooltip.close(root);
    trigger.dispatchEvent(new Event("pointerenter"));
    required(callbacks[0])();
    expect(content.hidden).toBe(true);
    required(callbacks[1])();
    expect(content.hidden).toBe(false);
  });
  it("releases a timer acquired after disposal during registration", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.enhance(root);
    const cleared = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    vi.spyOn(window as Window, "setTimeout").mockImplementationOnce(() => {
      star.dispose();
      return 902;
    });
    trigger.dispatchEvent(new Event("pointerenter"));
    expect(cleared).toHaveBeenCalledWith(902);
    expect(content.hidden).toBe(true);
  });
  it("keeps a newer close during listener acquisition", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    const add = trigger.addEventListener.bind(trigger);
    vi.spyOn(trigger, "addEventListener").mockImplementationOnce((type, listener, options) => {
      add(type, listener, options);
      ui.tooltip.close(root);
    });
    ui.tooltip.open(root);
    expect(content.hidden).toBe(true);
    expect(root.dataset.state).toBe("closed");
  });
  it("keeps a newer close during old listener cleanup", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.enhance(root);
    trigger.replaceWith(trigger.cloneNode(true));
    const remove = trigger.removeEventListener.bind(trigger);
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((type, listener, options) => {
      remove(type, listener, options);
      ui.tooltip.close(root);
    });
    ui.tooltip.open(root);
    expect(content.hidden).toBe(true);
  });
  it("releases all listeners when one removal fails", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.tooltip.open(root);
    const removed = vi.spyOn(content, "removeEventListener");
    const remove = trigger.removeEventListener.bind(trigger);
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((type, listener, options) => {
      remove(type, listener, options);
      throw new Error("listener cleanup failure");
    });
    try {
      expect(() => star.dispose()).toThrow();
      expect(removed).toHaveBeenCalledWith("pointerleave", expect.any(Function));
      expect(content.hidden).toBe(true);
    } finally {
      stars.splice(stars.indexOf(star), 1);
      root.remove();
    }
  });
  it.each(["root", "native", "aria", "fieldset", "inert"] as const)(
    "stops opening when before-open changes %s availability",
    (mode) => {
      const { ui } = install();
      const { root, trigger, content } = fixture("tooltip");
      ui.enhance(root);
      root.addEventListener("jquery-star:tooltip:before-open", () => {
        if (mode === "root") root.dataset.disabled = "true";
        else if (mode === "native") trigger.setAttribute("disabled", "");
        else if (mode === "aria") trigger.setAttribute("aria-disabled", "true");
        else if (mode === "inert") root.setAttribute("inert", "");
        else {
          const fieldset = document.createElement("fieldset");
          fieldset.disabled = true;
          root.replaceWith(fieldset);
          fieldset.append(root);
        }
      });
      const opened = vi.fn();
      root.addEventListener("jquery-star:tooltip:open", opened);
      ui.tooltip.open(root);
      expect(content.hidden).toBe(true);
      expect(opened).not.toHaveBeenCalled();
    },
  );
  it("keeps a newer no-op open from before-close", () => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    ui.tooltip.open(root);
    root.addEventListener("jquery-star:tooltip:before-close", () => ui.tooltip.open(root), {
      once: true,
    });
    ui.tooltip.close(root);
    expect(content.hidden).toBe(false);
  });
  it("stops geometry and notification after a newer close", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.enhance(root);
    const opened = vi.fn();
    root.addEventListener("jquery-star:tooltip:open", opened);
    vi.spyOn(trigger, "getBoundingClientRect").mockImplementationOnce(() => {
      ui.tooltip.close(root);
      return new DOMRect();
    });
    ui.tooltip.open(root);
    expect(content.hidden).toBe(true);
    expect(opened).not.toHaveBeenCalled();
    expect(content.style.left).toBe("");
  });
  it("refreshes generated description IDs while keeping authored tokens", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture("tooltip");
    trigger.setAttribute("aria-describedby", "authored");
    ui.enhance(root);
    const old = content.id;
    content.id = "replacement-description";
    ui.enhance(root);
    expect(trigger.getAttribute("aria-describedby")).toBe("authored replacement-description");
    expect(trigger.getAttribute("aria-describedby")).not.toContain(old);
    star.dispose();
    expect(trigger.getAttribute("aria-describedby")).toBe("authored");
  });
  it("ignores canceled native interaction and nested trigger descendants", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    trigger.innerHTML =
      '<span data-jqs="native-test"><span id="nested-tooltip">Nested</span></span>';
    ui.enhance(root);
    required(trigger.querySelector("#nested-tooltip")).dispatchEvent(
      new Event("focusin", { bubbles: true }),
    );
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(true);
    const canceled = new Event("pointerenter", { cancelable: true });
    canceled.preventDefault();
    trigger.dispatchEvent(canceled);
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(true);
    ui.tooltip.open(root);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    escape.preventDefault();
    trigger.dispatchEvent(escape);
    const outside = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    outside.preventDefault();
    document.body.dispatchEvent(outside);
    expect(content.hidden).toBe(false);
  });
});

describe("Tooltip native state and description handoff", () => {
  function nativeContent(content: HTMLElement) {
    let open = false;
    const matches = content.matches.bind(content);
    vi.spyOn(content, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? open : matches(selector),
    );
    content.showPopover = () => {
      open = true;
    };
    content.hidePopover = () => {
      open = false;
    };
    return {
      open: () => open,
      set: (value: boolean) => {
        open = value;
      },
    };
  }
  it("keeps canceled native opening closed without an open notification", () => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    const native = nativeContent(content);
    content.showPopover = () => undefined;
    const opened = vi.fn();
    root.addEventListener("jquery-star:tooltip:open", opened);
    ui.tooltip.open(root);
    expect(native.open()).toBe(false);
    expect(root.dataset.state).toBe("closed");
    expect(opened).not.toHaveBeenCalled();
  });
  it.each([true, false])("keeps newer opposite work during native opening=%s", (opening) => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    const native = nativeContent(content);
    ui.enhance(root);
    if (!opening) ui.tooltip.open(root);
    let once = true;
    content[opening ? "showPopover" : "hidePopover"] = () => {
      if (once) {
        once = false;
        ui.tooltip[opening ? "close" : "open"](root);
      }
      native.set(opening);
    };
    ui.tooltip[opening ? "open" : "close"](root);
    expect(native.open()).toBe(!opening);
    expect(root.dataset.state).toBe(opening ? "closed" : "open");
  });
  it.each([true, false])("settles newer no-op work during native opening=%s", (opening) => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    const native = nativeContent(content);
    ui.enhance(root);
    if (!opening) ui.tooltip.open(root);
    let once = true;
    content[opening ? "showPopover" : "hidePopover"] = () => {
      if (once) {
        once = false;
        ui.tooltip[opening ? "open" : "close"](root);
      }
      native.set(opening);
    };
    ui.tooltip[opening ? "open" : "close"](root);
    expect(native.open()).toBe(opening);
    expect(root.dataset.state).toBe(opening ? "open" : "closed");
  });
  it("uses actual native state for late toggle delivery and immediate reopening", () => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    const native = nativeContent(content);
    ui.tooltip.open(root);
    const closed = new Event("toggle");
    Object.defineProperty(closed, "newState", { value: "closed" });
    content.dispatchEvent(closed);
    expect(root.dataset.state).toBe("open");
    native.set(false);
    content.dispatchEvent(new Event("toggle"));
    expect(root.dataset.state).toBe("closed");
    ui.tooltip.open(root);
    native.set(false);
    ui.tooltip.open(root);
    expect(native.open()).toBe(true);
    expect(root.dataset.state).toBe("open");
  });
  it("keeps generated description ownership through cleanup-time reacquisition", () => {
    const source = install();
    const destination = install(realm());
    const { root, trigger, content } = fixture("tooltip");
    const native = nativeContent(content);
    trigger.setAttribute("aria-describedby", "authored");
    source.ui.tooltip.open(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    let once = true;
    content.hidePopover = () => {
      if (once) {
        once = false;
        destination.ui.tooltip.open(root);
      }
      native.set(false);
    };
    source.star.dispose();
    expect(native.open()).toBe(true);
    expect(trigger.getAttribute("aria-describedby")).toBe(`authored ${content.id}`);
    destination.star.dispose();
    expect(trigger.getAttribute("aria-describedby")).toBe("authored");
  });
  it("keeps a newer native state requested from timer cancellation", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    ui.enhance(root);
    vi.spyOn(window as Window, "setTimeout").mockReturnValue(400);
    const clear = vi
      .spyOn(window as Window, "clearTimeout")
      .mockImplementationOnce(() => ui.tooltip.close(root));
    trigger.dispatchEvent(new Event("pointerenter"));
    ui.tooltip.open(root);
    expect(clear).toHaveBeenCalledWith(400);
    expect(content.hidden).toBe(true);
  });
  it("checks current constraints when a pending open becomes due", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("tooltip");
    root.dataset.delay = "100";
    ui.enhance(root);
    trigger.dispatchEvent(new Event("pointerenter"));
    trigger.setAttribute("disabled", "");
    vi.advanceTimersByTime(100);
    expect(content.hidden).toBe(true);
  });
  it("stops old opening when before-open replaces its content", () => {
    const { ui } = install();
    const { root, content } = fixture("tooltip");
    ui.enhance(root);
    const replacement = content.cloneNode(true) as HTMLElement;
    root.addEventListener(
      "jquery-star:tooltip:before-open",
      () => content.replaceWith(replacement),
      { once: true },
    );
    ui.tooltip.open(root);
    expect(content.hidden).toBe(true);
    expect(replacement.hidden).toBe(true);
    ui.tooltip.open(root);
    expect(replacement.hidden).toBe(false);
  });
});

it.each(["tooltip", "popover"] as const)(
  "%s closes authored native opening before toggle delivery",
  (kind) => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    let nativeOpen = false;
    const matches = content.matches.bind(content);
    vi.spyOn(content, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? nativeOpen : matches(selector),
    );
    content.showPopover = () => {
      nativeOpen = true;
    };
    content.hidePopover = () => {
      nativeOpen = false;
    };
    ui.enhance(root);
    content.showPopover();
    ui[kind].close(root);
    expect(nativeOpen).toBe(false);
    expect(root.dataset.state).toBe("closed");
  },
);
it("Tooltip native toggle cannot override newer state from timer cancellation", () => {
  const { ui } = install();
  const { root, trigger, content } = fixture("tooltip");
  let nativeOpen = false;
  const matches = content.matches.bind(content);
  vi.spyOn(content, "matches").mockImplementation((selector) =>
    selector === ":popover-open" ? nativeOpen : matches(selector),
  );
  content.showPopover = () => {
    nativeOpen = true;
  };
  content.hidePopover = () => {
    nativeOpen = false;
  };
  ui.enhance(root);
  vi.spyOn(window as Window, "setTimeout").mockReturnValue(499);
  vi.spyOn(window as Window, "clearTimeout").mockImplementationOnce(() => ui.tooltip.close(root));
  trigger.dispatchEvent(new Event("pointerenter"));
  nativeOpen = true;
  content.dispatchEvent(new Event("toggle"));
  expect(nativeOpen).toBe(false);
  expect(root.dataset.state).toBe("closed");
});

describe.each([
  ["popover", "tooltip"],
  ["tooltip", "popover"],
  ["tooltip", "hover-card"],
  ["popover", "hover-card"],
  ["hover-card", "tooltip"],
  ["hover-card", "popover"],
  ["popover", "menu"],
  ["popover", "context-menu"],
  ["tooltip", "menu"],
  ["tooltip", "context-menu"],
  ["hover-card", "menu"],
  ["hover-card", "context-menu"],
  ["menu", "popover"],
  ["menu", "tooltip"],
  ["menu", "hover-card"],
  ["menu", "context-menu"],
  ["context-menu", "popover"],
  ["context-menu", "tooltip"],
  ["context-menu", "hover-card"],
  ["context-menu", "menu"],
] as const)("Native content handoff from %s to %s", (previous, next) => {
  it.each(["showPopover", "hidePopover"] as const)(
    "keeps the new owner after old %s completes",
    (method) => {
      const { ui } = install();
      const { root, content } = fixture(previous);
      content.textContent = "Common noninteractive panel";
      let nativeOpen = false;
      const matches = content.matches.bind(content);
      vi.spyOn(content, "matches").mockImplementation((selector) =>
        selector === ":popover-open" ? nativeOpen : matches(selector),
      );
      content.showPopover = () => {
        nativeOpen = true;
      };
      content.hidePopover = () => {
        nativeOpen = false;
      };
      ui.enhance(root);
      if (method === "hidePopover") open(ui, previous, root);
      let once = true;
      const opened = vi.fn();
      root.addEventListener(`jquery-star:${next}:open`, opened);
      content[method] = () => {
        if (once) {
          once = false;
          root.dataset.jqs = next;
          open(ui, next, root);
        }
        nativeOpen = method === "showPopover";
      };
      if (method === "showPopover") open(ui, previous, root);
      else close(ui, previous, root);
      expect(root.dataset.jqs).toBe(next);
      expect(opened).toHaveBeenCalledOnce();
      expect(nativeOpen).toBe(true);
      expect(root.dataset.state).toBe("open");
      close(ui, next, root);
      expect(nativeOpen).toBe(false);
    },
  );
});

it.each(["popover", "tooltip"] as const)(
  "%s honors newer close during interrupted hide recovery",
  (kind) => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    let nativeOpen = false;
    const matches = content.matches.bind(content);
    vi.spyOn(content, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? nativeOpen : matches(selector),
    );
    content.showPopover = () => {
      nativeOpen = true;
    };
    content.hidePopover = () => {
      nativeOpen = false;
    };
    ui[kind].open(root);
    let hiding = 0;
    content.showPopover = () => {
      if (!nativeOpen) ui[kind].close(root);
      nativeOpen = true;
    };
    content.hidePopover = () => {
      hiding++;
      if (hiding === 1) ui[kind].open(root);
      nativeOpen = false;
    };
    ui[kind].close(root);
    expect(nativeOpen).toBe(false);
    expect(root.dataset.state).toBe("closed");
  },
);

function retainedFloatingDeadline(
  kind: "tooltip" | "hover-card",
  closing: boolean,
  disposedFirst: boolean,
) {
  const source = install();
  const destination = install(realm());
  const { root, trigger, content } = fixture(kind);
  root.dataset.delay = "100";
  root.dataset.closeDelay = "100";
  source.ui.enhance(root);
  if (closing) open(source.ui, kind, root);
  const old: Array<() => void> = [];
  const next: Array<{ callback: () => void; delay: number | undefined }> = [];
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
    old.push(callback as () => void);
    return 101;
  });
  const cleared = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
  vi.spyOn(destination.owner, "setTimeout").mockImplementation((callback, delay) => {
    next.push({ callback: callback as () => void, delay });
    return 202;
  });
  vi.spyOn(destination.owner, "clearTimeout").mockImplementation(() => undefined);
  trigger.dispatchEvent(new Event(closing ? "pointerleave" : "pointerenter"));
  now += 40;
  destination.owner.document.body.append(destination.owner.document.adoptNode(root));
  if (disposedFirst) source.star.dispose();
  destination.ui.enhance(root);
  source.star.dispose();
  expect(cleared).toHaveBeenCalledWith(101);
  expect(next.map((entry) => entry.delay)).toEqual([60]);
  required(old[0])();
  expect(content.hidden).toBe(!closing);
  now += 60;
  required(next[0]).callback();
  expect(content.hidden).toBe(closing);
}

describe("Hover Card document and delayed continuations", () => {
  it("automatically enhances its foreign document", async () => {
    const { owner, star } = install(realm());
    await star.whenEnhanced();
    const { root, trigger } = fixture("hover-card", owner);
    await star.whenEnhanced();
    trigger.dispatchEvent(new (owner as Window & typeof globalThis).Event("pointerenter"));
    await new Promise((resolve) => owner.setTimeout(resolve, 10));
    expect(root.dataset.state).toBe("open");
  });
  it.each(["implicit", "selector", "element"] as const)(
    "runs its foreign %s action",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const { root, trigger } = fixture("hover-card", owner);
      trigger.setAttribute(
        "data-on:click",
        mode === "selector" ? "@ui.hover-card.open('#floating')" : "@ui.hover-card.open",
      );
      const app = jquery(root).star();
      if (mode === "element")
        await app.star("instance")?.run("ui.hover-card.open", { args: [root] });
      else trigger.click();
      expect(root.dataset.state).toBe("open");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains open state and content focus through adopted %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, content } = fixture("hover-card");
      source.ui.hoverCard.open(root);
      const outside = destination.owner.document.createElement("button");
      destination.owner.document.body.append(outside);
      const focused = required(content.querySelector<HTMLButtonElement>("button"));
      focused.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      const opened = vi.fn();
      root.addEventListener("jquery-star:hover-card:open", opened);
      if (mode === "facade") destination.ui.hoverCard.open(root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(content.hidden).toBe(false);
      expect(root.dataset.state).toBe("open");
      expect(destination.owner.document.activeElement).toBe(focused);
      expect(opened).not.toHaveBeenCalled();
      const events: Event[] = [];
      root.addEventListener("jquery-star:hover-card:close", (event) => events.push(event));
      destination.ui.hoverCard.close(root);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
    },
  );
  it.each(["trigger", "content"] as const)(
    "reacquires current %s parts through its facade",
    (name) => {
      const { ui } = install();
      const { root, trigger, content } = fixture("hover-card");
      ui.enhance(root);
      const previous = name === "trigger" ? trigger : content;
      const replacement = previous.cloneNode(true) as HTMLElement;
      previous.replaceWith(replacement);
      ui.hoverCard.open(root);
      expect(required(root.querySelector<HTMLElement>('[data-part="content"]')).hidden).toBe(false);
      expect(
        required(root.querySelector('[data-part="trigger"]')).getAttribute("aria-controls"),
      ).toBe(required(root.querySelector<HTMLElement>('[data-part="content"]')).id);
      ui.hoverCard.close(root);
      previous.dispatchEvent(new Event("pointerenter"));
      expect(root.dataset.state).toBe("closed");
    },
  );
  it("keeps stable bindings and the original pending delay", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    root.dataset.delay = "100";
    ui.enhance(root);
    trigger.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(40);
    const add = vi.spyOn(trigger, "addEventListener");
    const remove = vi.spyOn(trigger, "removeEventListener");
    ui.enhance(root);
    ui.enhance(root);
    vi.advanceTimersByTime(59);
    expect(content.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(content.hidden).toBe(false);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "retains an opening deadline across adoption with source disposal first=%s",
    (disposedFirst) => {
      retainedFloatingDeadline("hover-card", false, disposedFirst);
    },
  );
  it.each([false, true])(
    "retains a closing deadline across adoption with source disposal first=%s",
    (disposedFirst) => {
      retainedFloatingDeadline("hover-card", true, disposedFirst);
    },
  );
  it("ignores a canceled timer callback after a replacement interaction", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.enhance(root);
    const callbacks: Array<() => void> = [];
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      callbacks.push(callback as () => void);
      return callbacks.length;
    });
    vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    trigger.dispatchEvent(new Event("pointerenter"));
    ui.hoverCard.close(root);
    trigger.dispatchEvent(new Event("pointerenter"));
    required(callbacks[0])();
    expect(content.hidden).toBe(true);
    required(callbacks[1])();
    expect(content.hidden).toBe(false);
  });
  it("releases a timer acquired after disposal during registration", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.enhance(root);
    const cleared = vi.spyOn(window as Window, "clearTimeout").mockImplementation(() => undefined);
    vi.spyOn(window as Window, "setTimeout").mockImplementationOnce(() => {
      star.dispose();
      return 902;
    });
    trigger.dispatchEvent(new Event("pointerenter"));
    expect(cleared).toHaveBeenCalledWith(902);
    expect(content.hidden).toBe(true);
  });
  it("keeps a newer close during listener acquisition", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    const add = trigger.addEventListener.bind(trigger);
    vi.spyOn(trigger, "addEventListener").mockImplementationOnce((type, listener, options) => {
      add(type, listener, options);
      ui.hoverCard.close(root);
    });
    ui.hoverCard.open(root);
    expect(content.hidden).toBe(true);
    expect(root.dataset.state).toBe("closed");
  });
  it("keeps a newer close during old listener cleanup", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.enhance(root);
    trigger.replaceWith(trigger.cloneNode(true));
    const remove = trigger.removeEventListener.bind(trigger);
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((type, listener, options) => {
      remove(type, listener, options);
      ui.hoverCard.close(root);
    });
    ui.hoverCard.open(root);
    expect(content.hidden).toBe(true);
  });
  it("releases all listeners when one removal fails", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.hoverCard.open(root);
    const removed = vi.spyOn(content, "removeEventListener");
    const remove = trigger.removeEventListener.bind(trigger);
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((type, listener, options) => {
      remove(type, listener, options);
      throw new Error("listener cleanup failure");
    });
    try {
      expect(() => star.dispose()).toThrow();
      expect(removed).toHaveBeenCalledWith("pointerleave", expect.any(Function));
      expect(content.hidden).toBe(true);
    } finally {
      stars.splice(stars.indexOf(star), 1);
      root.remove();
    }
  });
  it.each(["root", "native", "aria", "fieldset", "inert"] as const)(
    "stops opening when before-open changes %s availability",
    (mode) => {
      const { ui } = install();
      const { root, trigger, content } = fixture("hover-card");
      ui.enhance(root);
      root.addEventListener("jquery-star:hover-card:before-open", () => {
        if (mode === "root") root.dataset.disabled = "true";
        else if (mode === "native") trigger.setAttribute("disabled", "");
        else if (mode === "aria") trigger.setAttribute("aria-disabled", "true");
        else if (mode === "inert") root.setAttribute("inert", "");
        else {
          const fieldset = document.createElement("fieldset");
          fieldset.disabled = true;
          root.replaceWith(fieldset);
          fieldset.append(root);
        }
      });
      const opened = vi.fn();
      root.addEventListener("jquery-star:hover-card:open", opened);
      ui.hoverCard.open(root);
      expect(content.hidden).toBe(true);
      expect(opened).not.toHaveBeenCalled();
    },
  );
  it("keeps a newer no-op open from before-close", () => {
    const { ui } = install();
    const { root, content } = fixture("hover-card");
    ui.hoverCard.open(root);
    root.addEventListener("jquery-star:hover-card:before-close", () => ui.hoverCard.open(root), {
      once: true,
    });
    ui.hoverCard.close(root);
    expect(content.hidden).toBe(false);
  });
  it("stops geometry and notification after a newer close", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.enhance(root);
    const opened = vi.fn();
    root.addEventListener("jquery-star:hover-card:open", opened);
    vi.spyOn(trigger, "getBoundingClientRect").mockImplementationOnce(() => {
      ui.hoverCard.close(root);
      return new DOMRect();
    });
    ui.hoverCard.open(root);
    expect(content.hidden).toBe(true);
    expect(opened).not.toHaveBeenCalled();
    expect(content.style.left).toBe("");
  });
  it("ignores canceled native interaction and nested trigger descendants", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    trigger.innerHTML =
      '<span data-jqs="native-test"><span id="nested-tooltip">Nested</span></span>';
    ui.enhance(root);
    required(trigger.querySelector("#nested-tooltip")).dispatchEvent(
      new Event("focusin", { bubbles: true }),
    );
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(true);
    const canceled = new Event("pointerenter", { cancelable: true });
    canceled.preventDefault();
    trigger.dispatchEvent(canceled);
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(true);
    ui.hoverCard.open(root);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    escape.preventDefault();
    trigger.dispatchEvent(escape);
    const outside = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    outside.preventDefault();
    document.body.dispatchEvent(outside);
    expect(content.hidden).toBe(false);
  });
});

describe("Hover Card focus and labels", () => {
  it("preserves current owned titles and authored names", () => {
    const { ui } = install();
    const { root, content } = fixture("hover-card");
    content.insertAdjacentHTML(
      "afterbegin",
      '<div data-jqs="native-test"><h2 data-part="title" id="nested-hover-title">Nested</h2></div>',
    );
    ui.enhance(root);
    const title = required(content.querySelector<HTMLElement>(':scope > [data-part="title"]'));
    expect(content.getAttribute("aria-labelledby")).toBe(title.id);
    title.id = "current-hover-title";
    ui.enhance(root);
    expect(content.getAttribute("aria-labelledby")).toBe(title.id);
    content.setAttribute("aria-label", "Authored card");
    content.removeAttribute("aria-labelledby");
    ui.enhance(root);
    expect(content.getAttribute("aria-label")).toBe("Authored card");
    expect(content.hasAttribute("aria-labelledby")).toBe(false);
  });
  it("does not leave focus-open suppression after native hiding already returned focus", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    const inside = required(content.querySelector<HTMLButtonElement>("button"));
    content.showPopover = () => {
      content.hidden = false;
    };
    content.hidePopover = () => {
      trigger.focus();
      content.hidden = true;
    };
    ui.hoverCard.open(root);
    inside.focus();
    ui.hoverCard.close(root);
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    trigger.blur();
    trigger.focus();
    vi.runOnlyPendingTimers();
    expect(content.hidden).toBe(false);
  });
  it("keeps newer open from dismissal focus callbacks", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.hoverCard.open(root);
    required(content.querySelector<HTMLButtonElement>("button")).focus();
    trigger.addEventListener("focus", () => ui.hoverCard.open(root), { once: true });
    const closed = vi.fn();
    root.addEventListener("jquery-star:hover-card:close", closed);
    ui.hoverCard.close(root);
    expect(content.hidden).toBe(false);
    expect(closed).not.toHaveBeenCalled();
  });
  it("keeps content focus and exact native listeners through stable enhancement", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture("hover-card");
    ui.hoverCard.open(root);
    const focused = required(content.querySelector<HTMLButtonElement>('button[data-value="b"]'));
    focused.focus();
    const add = vi.spyOn(trigger, "addEventListener");
    const remove = vi.spyOn(content, "removeEventListener");
    ui.enhance(root);
    ui.enhance(root);
    expect(document.activeElement).toBe(focused);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it("does not restore an explicitly blurred content target on adoption", () => {
    const source = install();
    const destination = install(realm());
    const { root, content } = fixture("hover-card");
    source.ui.hoverCard.open(root);
    const focused = required(content.querySelector<HTMLButtonElement>("button"));
    focused.focus();
    focused.blur();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    expect(destination.owner.document.activeElement).not.toBe(focused);
  });
});

it("Hover Card ignores a departure timer after native removal detaches its preserved root", () => {
  vi.useFakeTimers();
  const { ui } = install();
  const { root, content } = fixture("hover-card");
  ui.hoverCard.open(root);
  const inside = required(content.querySelector<HTMLButtonElement>("button"));
  inside.focus();
  inside.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  root.remove();
  vi.runOnlyPendingTimers();
  document.body.append(root);
  ui.enhance(root);
  expect(root.dataset.state).toBe("open");
  expect(content.hidden).toBe(false);
});

it("Hover Card keeps explicit detached activation available", () => {
  vi.useFakeTimers();
  const { ui } = install();
  const { root, trigger, content } = fixture("hover-card");
  root.remove();
  ui.enhance(root);
  trigger.dispatchEvent(new Event("pointerenter"));
  vi.runOnlyPendingTimers();
  expect(root.dataset.state).toBe("open");
  expect(content.hidden).toBe(false);
});

describe.each(["menu", "context-menu"] as const)("%s current document and interaction", (kind) => {
  it("automatically enhances a foreign document", async () => {
    const { owner, ui, star } = install(realm());
    await star.whenEnhanced();
    const { root, trigger, content } = fixture(kind, owner);
    await star.whenEnhanced();
    if (kind === "menu") trigger.click();
    else
      trigger.dispatchEvent(
        new (owner as Window & typeof globalThis).MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 30,
          clientY: 40,
        }),
      );
    expect(content.hidden).toBe(false);
    close(ui, kind, root);
  });
  it.each(["implicit", "selector", "class-selector", "element"] as const)(
    "runs its foreign %s action",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const { root, content } = fixture(kind, owner);
      root.className = "target-menu";
      const app = jquery(root).star();
      const args: unknown[] =
        mode === "implicit"
          ? []
          : [mode === "element" ? root : mode === "selector" ? "#floating" : ".target-menu"];
      if (kind === "context-menu") args.push(30, 40);
      await app.star("instance")?.run(`ui.${kind}.open`, { args });
      expect(content.hidden).toBe(false);
      if (kind === "context-menu") expect(content.style.left).toBe("30px");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains adopted open state through %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, content } = fixture(kind);
      open(source.ui, kind, root);
      const focused = required(content.querySelector<HTMLElement>('[data-value="b"]'));
      focused.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") open(destination.ui, kind, root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(root.dataset.state).toBe("open");
      expect(content.hidden).toBe(false);
      expect(destination.owner.document.activeElement).toBe(
        mode === "facade" ? content.querySelector('[data-value="a"]') : focused,
      );
      if (kind === "context-menu") expect(content.style.left).toBe("10px");
    },
  );
  it("preserves stable native bindings, exploration and current generated labels", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture(kind);
    open(ui, kind, root);
    const focused = required(content.querySelector<HTMLElement>('[data-value="b"]'));
    focused.focus();
    const added = vi.spyOn(trigger, "addEventListener");
    const removed = vi.spyOn(focused, "removeEventListener");
    trigger.id = "current-menu-trigger";
    ui.enhance(root);
    ui.enhance(root);
    expect(document.activeElement).toBe(focused);
    expect(added).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
    expect(content.getAttribute("aria-labelledby")).toBe(trigger.id);
  });
  it.each(["trigger", "content", "item"] as const)(
    "reacquires current %s through its facade",
    (name) => {
      const { ui } = install();
      const { root, trigger, content } = fixture(kind);
      ui.enhance(root);
      const old =
        name === "trigger"
          ? trigger
          : name === "content"
            ? content
            : required(content.querySelector<HTMLElement>("button"));
      const replacement = old.cloneNode(true) as HTMLElement;
      old.replaceWith(replacement);
      open(ui, kind, root);
      const currentContent = required(root.querySelector<HTMLElement>('[data-part="content"]'));
      expect(currentContent.hidden).toBe(false);
      expect(document.activeElement).toBe(currentContent.querySelector("button"));
      close(ui, kind, root);
      old.dispatchEvent(
        new MouseEvent(kind === "context-menu" && name === "trigger" ? "contextmenu" : "click", {
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(root.dataset.state).toBe("closed");
    },
  );
  it("keeps newer repeated open from before-close", () => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    open(ui, kind, root);
    root.addEventListener(`jquery-star:${kind}:before-close`, () => open(ui, kind, root), {
      once: true,
    });
    close(ui, kind, root);
    expect(content.hidden).toBe(false);
    expect(document.activeElement).toBe(content.querySelector("button"));
  });
  it.each(["root", "native", "aria", "fieldset", "inert"] as const)(
    "stops opening after %s availability changes",
    (mode) => {
      const { ui } = install();
      const { root, trigger, content } = fixture(kind);
      root.addEventListener(
        `jquery-star:${kind}:before-open`,
        () => {
          if (mode === "root") root.dataset.disabled = "true";
          else if (mode === "native") trigger.setAttribute("disabled", "");
          else if (mode === "aria") trigger.setAttribute("aria-disabled", "true");
          else if (mode === "inert") root.setAttribute("inert", "");
          else {
            const fieldset = document.createElement("fieldset");
            fieldset.disabled = true;
            root.before(fieldset);
            fieldset.append(root);
          }
        },
        { once: true },
      );
      open(ui, kind, root);
      expect(content.hidden).toBe(true);
      expect(root.dataset.state).toBe("closed");
    },
  );
  it("stops positioning, focus and notification after geometry requests close", () => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    ui.enhance(root);
    const focused = vi.spyOn(required(content.querySelector<HTMLElement>("button")), "focus");
    const opened = vi.fn();
    root.addEventListener(`jquery-star:${kind}:open`, opened);
    vi.spyOn(content, "getBoundingClientRect").mockImplementationOnce(() => {
      close(ui, kind, root);
      return new DOMRect();
    });
    open(ui, kind, root);
    expect(content.hidden).toBe(true);
    expect(content.style.left).toBe("");
    expect(focused).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
  });
  it("stops its open event after initial focus requests close", () => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    required(content.querySelector("button")).addEventListener(
      "focus",
      () => close(ui, kind, root),
      { once: true },
    );
    const opened = vi.fn();
    root.addEventListener(`jquery-star:${kind}:open`, opened);
    open(ui, kind, root);
    expect(content.hidden).toBe(true);
    expect(opened).not.toHaveBeenCalled();
  });
  it.each(["remove", "replace", "disable", "inert", "newer-close"] as const)(
    "does not select stale items after callback %s",
    (mode) => {
      const { ui } = install();
      const { root, content } = fixture(kind);
      const item = required(content.querySelector<HTMLElement>("button"));
      item.dataset.part = "checkbox-item";
      item.dataset.closeOnSelect = "false";
      open(ui, kind, root);
      root.addEventListener(
        `jquery-star:${kind}:select`,
        () => {
          if (mode === "remove") item.remove();
          else if (mode === "replace") item.replaceWith(item.cloneNode(true));
          else if (mode === "disable") item.setAttribute("aria-disabled", "true");
          else if (mode === "inert") content.setAttribute("inert", "");
          else close(ui, kind, root);
        },
        { once: true },
      );
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      item.dispatchEvent(event);
      expect(item.getAttribute("aria-checked")).toBe("false");
      expect(event.defaultPrevented).toBe(true);
    },
  );
  it("keeps aria-disabled items focusable but rejects activation under current constraints", () => {
    const { ui } = install();
    const { root, content } = fixture(kind);
    const item = required(content.querySelector<HTMLElement>('[data-value="b"]'));
    item.setAttribute("aria-disabled", "true");
    open(ui, kind, root);
    required(content.querySelector("button")).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(item);
    const selected = vi.fn();
    root.addEventListener(`jquery-star:${kind}:select`, selected);
    item.click();
    expect(selected).not.toHaveBeenCalled();
    item.removeAttribute("aria-disabled");
    item.dataset.disabled = "false";
    item.click();
    expect(selected).toHaveBeenCalledOnce();
  });
  it("ignores canceled activation and nested keyboard or pointer events", () => {
    const { ui } = install();
    const { root, trigger, content } = fixture(kind);
    trigger.innerHTML =
      '<span data-jqs="native-test"><span id="nested-menu-trigger">Nested</span></span>';
    content.insertAdjacentHTML(
      "beforeend",
      '<section data-jqs="native-test"><button data-part="item" id="nested-menu-item">Nested</button></section>',
    );
    ui.enhance(root);
    const canceled = new MouseEvent(kind === "menu" ? "click" : "contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    canceled.preventDefault();
    trigger.dispatchEvent(canceled);
    expect(content.hidden).toBe(true);
    required(trigger.querySelector("#nested-menu-trigger")).dispatchEvent(
      new MouseEvent(kind === "menu" ? "click" : "contextmenu", {
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(content.hidden).toBe(true);
    open(ui, kind, root);
    const nested = required(content.querySelector<HTMLElement>("#nested-menu-item"));
    nested.focus();
    nested.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    expect(content.hidden).toBe(false);
  });
  it("keeps a canceled sibling open without accepting a second panel", () => {
    const { ui } = install();
    const first = fixture(kind);
    first.root.id = "first-menu";
    const next = fixture(kind);
    next.root.id = "next-menu";
    open(ui, kind, first.root);
    first.root.addEventListener(`jquery-star:${kind}:before-close`, (event) =>
      event.preventDefault(),
    );
    const opened = vi.fn();
    next.root.addEventListener(`jquery-star:${kind}:open`, opened);
    open(ui, kind, next.root);
    expect(first.content.hidden).toBe(false);
    expect(next.content.hidden).toBe(true);
    expect(opened).not.toHaveBeenCalled();
  });
  it("releases every native listener even when one removal fails", () => {
    const { ui, star } = install();
    const { root, trigger, content } = fixture(kind);
    ui.enhance(root);
    const remove = trigger.removeEventListener.bind(trigger);
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("remove-first");
    });
    const removed = vi.spyOn(content, "removeEventListener");
    try {
      expect(() => star.dispose()).toThrow();
      expect(removed).toHaveBeenCalled();
    } finally {
      stars.splice(stars.indexOf(star), 1);
      root.remove();
    }
  });
});

describe.each(["menu", "context-menu"] as const)("%s delayed ownership", (kind) => {
  it.each([false, true])(
    "retains search and remaining delay across adoption, disposed first=%s",
    (disposedFirst) => {
      const source = install();
      const destination = install(realm());
      const { root, content } = fixture(kind);
      content.insertAdjacentHTML(
        "beforeend",
        '<button data-part="item" data-value="baker">Baker</button>',
      );
      open(source.ui, kind, root);
      let now = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      let previous: (() => void) | undefined;
      vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
        previous = callback as () => void;
        return 700;
      });
      const clear = vi.spyOn(window as Window, "clearTimeout");
      required(content.querySelector("button")).dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", bubbles: true }),
      );
      expect(document.activeElement).toBe(content.querySelector('[data-value="b"]'));
      now = 1150;
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (disposedFirst) source.star.dispose();
      const delays: number[] = [];
      const callbacks: Array<() => void> = [];
      vi.spyOn(destination.owner, "setTimeout").mockImplementation((callback, delay) => {
        delays.push(delay ?? 0);
        callbacks.push(callback as () => void);
        return 701;
      });
      destination.ui.enhance(root);
      source.star.dispose();
      expect(clear).toHaveBeenCalledWith(700);
      expect(delays).toEqual([350]);
      required(previous)();
      required(content.querySelector('[data-value="b"]')).dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
      expect(destination.owner.document.activeElement).toBe(
        content.querySelector('[data-value="baker"]'),
      );
      required(callbacks.at(-1))();
      required(content.querySelector('[data-value="baker"]')).dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
      expect(destination.owner.document.activeElement).toBe(
        content.querySelector('[data-value="a"]'),
      );
    },
  );
  it("releases a search timer whose registration disposes its owner", () => {
    const { ui, star } = install();
    const { root, content } = fixture(kind);
    open(ui, kind, root);
    const clear = vi.spyOn(window as Window, "clearTimeout");
    vi.spyOn(window as Window, "setTimeout").mockImplementationOnce(() => {
      star.dispose();
      return 704;
    });
    required(content.querySelector("button")).dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", bubbles: true }),
    );
    expect(clear).toHaveBeenCalledWith(704);
    expect(content.hidden).toBe(true);
  });
});
it.each([false, true])(
  "Context Menu retains its long-press point and deadline across adoption, disposed first=%s",
  (disposedFirst) => {
    const source = install();
    const destination = install(realm());
    const { root, trigger, content } = fixture("context-menu");
    source.ui.enhance(root);
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    let previous: (() => void) | undefined;
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      previous = callback as () => void;
      return 800;
    });
    const clear = vi.spyOn(window as Window, "clearTimeout");
    const event = new MouseEvent("pointerdown", { clientX: 64, clientY: 72, bubbles: true });
    Object.defineProperty(event, "pointerType", { value: "touch" });
    trigger.dispatchEvent(event);
    now = 1200;
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    let current: (() => void) | undefined;
    vi.spyOn(destination.owner, "setTimeout").mockImplementation((callback, delay) => {
      delays.push(delay ?? 0);
      current = callback as () => void;
      return 801;
    });
    destination.ui.enhance(root);
    source.star.dispose();
    expect(clear).toHaveBeenCalledWith(800);
    expect(delays).toEqual([350]);
    required(previous)();
    expect(content.hidden).toBe(true);
    required(current)();
    expect(content.hidden).toBe(false);
    expect(content.style.left).toBe("64px");
    expect(content.style.top).toBe("72px");
  },
);

it("Menubar stable enhancement does not feed its watched value back into the observer", () => {
  const { ui } = install();
  const { root } = fixture("menubar");
  ui.menubar.open(root, "first");
  const observer = new MutationObserver(() => undefined);
  observer.observe(root, { attributes: true, attributeFilter: ["data-value"] });
  try {
    ui.enhance(root);
    expect(observer.takeRecords()).toHaveLength(0);
  } finally {
    observer.disconnect();
  }
});

it("Menu ArrowUp focuses empty content after native acceptance", () => {
  const { ui } = install();
  const { root, trigger, content } = fixture("menu");
  content.textContent = "No commands";
  ui.enhance(root);
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }),
  );
  expect(document.activeElement).toBe(content);
});

function menuBarFixture(owner: Window = window) {
  const { root } = fixture("menubar", owner);
  root.id = "bar";
  const first = required(root.firstElementChild);
  for (const value of ["second", "third"]) {
    const child = first.cloneNode(true) as HTMLElement;
    child.dataset.value = value;
    required(child.querySelector('[data-part="trigger"]')).textContent =
      value === "second" ? "Beta" : "Gamma";
    root.append(child);
  }
  const menus = Array.from(root.children) as HTMLElement[];
  const triggers = menus.map((menu) =>
    required(menu.querySelector<HTMLElement>('[data-part="trigger"]')),
  );
  return { root, menus, triggers };
}
describe("Menubar current ownership and continuations", () => {
  it("automatically enhances foreign triggers and value", async () => {
    const { ui, owner, star } = install(realm());
    await star.whenEnhanced();
    const { root, triggers } = menuBarFixture(owner);
    await star.whenEnhanced();
    required(triggers[1]).click();
    expect(root.dataset.state).toBe("open");
    expect(ui.menubar.value(root)).toBe("second");
  });
  it.each(["implicit", "selector", "element"] as const)(
    "runs its foreign %s action",
    async (mode) => {
      const { jquery, owner, ui } = install(realm());
      const { root } = menuBarFixture(owner);
      const app = jquery(root).star();
      await app.star("instance")?.run("ui.menubar.open", {
        args: mode === "implicit" ? ["second"] : [mode === "element" ? root : "#bar", "second"],
      });
      expect(ui.menubar.value(root)).toBe("second");
      expect(root.dataset.state).toBe("open");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains adopted roving value and open child through %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, menus, triggers } = menuBarFixture();
      source.ui.menubar.open(root, "second");
      const target = required(required(menus[1]).querySelector<HTMLElement>('[data-value="b"]'));
      target.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") expect(destination.ui.menubar.value(root)).toBe("second");
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(destination.ui.menubar.value(root)).toBe("second");
      expect(required(triggers[1]).tabIndex).toBe(0);
      expect(destination.owner.document.activeElement).toBe(target);
      destination.ui.menubar.close(root);
      expect(root.dataset.state).toBe("closed");
    },
  );
  it("retains stable exploration, exact listeners and pending search", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, triggers } = menuBarFixture();
    ui.enhance(root);
    required(triggers[0]).focus();
    required(triggers[0]).dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    const add = vi.spyOn(root, "addEventListener");
    const remove = vi.spyOn(required(triggers[1]), "removeEventListener");
    const clear = vi.spyOn(window as Window, "clearTimeout");
    ui.enhance(root);
    ui.enhance(root);
    expect(document.activeElement).toBe(triggers[1]);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
  it.each(["menu", "trigger"] as const)("reacquires current %s through facade", (part) => {
    const { ui } = install();
    const { root, menus, triggers } = menuBarFixture();
    ui.enhance(root);
    const old = required(part === "menu" ? menus[1] : triggers[1]);
    const next = old.cloneNode(true) as HTMLElement;
    old.replaceWith(next);
    ui.menubar.focus(root, "second");
    expect(document.activeElement).toBe(
      part === "menu" ? next.querySelector('[data-part="trigger"]') : next,
    );
    const current = document.activeElement;
    old.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(current);
  });
  it("does not resume an older opening after a child before-open requests parent close", () => {
    const { ui } = install();
    const { root, menus } = menuBarFixture();
    ui.enhance(root);
    required(menus[1]).addEventListener(
      "jquery-star:menu:before-open",
      () => ui.menubar.close(root),
      { once: true },
    );
    ui.menubar.open(root, "second");
    expect(root.dataset.state).toBe("closed");
    expect(ui.menubar.value(root)).toBeUndefined();
  });
  it("does not close a newer selected child from an older parent close loop", () => {
    const { ui } = install();
    const { root, menus } = menuBarFixture();
    ui.menubar.open(root, "first");
    required(menus[0]).addEventListener(
      "jquery-star:menu:before-close",
      () => ui.menubar.open(root, "second"),
      { once: true },
    );
    ui.menubar.close(root);
    expect(ui.menubar.value(root)).toBe("second");
    expect(required(menus[1]).dataset.state).toBe("open");
  });
  it("stops an older keyboard switch after focus requests another menu", () => {
    const { ui } = install();
    const { root, triggers } = menuBarFixture();
    ui.menubar.open(root, "first");
    required(triggers[1]).addEventListener("focus", () => ui.menubar.open(root, "third"), {
      once: true,
    });
    required(triggers[0]).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    expect(ui.menubar.value(root)).toBe("third");
  });
  it.each(["disabled", "aria", "inert", "fieldset"] as const)(
    "rejects current %s constraints",
    (mode) => {
      const { ui } = install();
      const { root, triggers } = menuBarFixture();
      ui.enhance(root);
      if (mode === "disabled") root.dataset.disabled = "true";
      else if (mode === "aria") required(triggers[1]).setAttribute("aria-disabled", "true");
      else if (mode === "inert") root.setAttribute("inert", "");
      else {
        const fieldset = document.createElement("fieldset");
        fieldset.disabled = true;
        root.before(fieldset);
        fieldset.append(root);
      }
      ui.menubar.open(root, "second");
      expect(ui.menubar.value(root)).toBeUndefined();
      ui.menubar.focus(root, "second");
      expect(document.activeElement).not.toBe(triggers[1]);
    },
  );
  it("accepts data-disabled=false without allowing a native disabled trigger", () => {
    const { ui } = install();
    const { root, triggers } = menuBarFixture();
    required(triggers[1]).dataset.disabled = "false";
    ui.menubar.open(root, "second");
    expect(ui.menubar.value(root)).toBe("second");
    ui.menubar.close(root);
    required(triggers[1]).setAttribute("disabled", "");
    ui.menubar.open(root, "second");
    expect(ui.menubar.value(root)).toBeUndefined();
  });
  it("ignores canceled Tab and horizontal switching from child content", () => {
    const { ui } = install();
    const { root, menus, triggers } = menuBarFixture();
    ui.menubar.open(root, "first");
    const target = required(required(menus[0]).querySelector('[data-part="item"]'));
    for (const [element, key] of [
      [target, "ArrowRight"],
      [required(triggers[0]), "Tab"],
    ] as const) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      event.preventDefault();
      element.dispatchEvent(event);
      expect(ui.menubar.value(root)).toBe("first");
    }
  });
  it("ignores nested menu keyboard and child lifecycle events", () => {
    const { ui } = install();
    const { root, menus } = menuBarFixture();
    const outer = required(menus[0]);
    const content = required(outer.querySelector('[data-part="content"]'));
    content.insertAdjacentHTML(
      "beforeend",
      '<section data-jqs="native-test"><button id="nested-bar">Nested</button></section>',
    );
    ui.menubar.open(root, "first");
    const nested = required(content.querySelector("#nested-bar"));
    nested.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    expect(ui.menubar.value(root)).toBe("first");
    nested.dispatchEvent(new CustomEvent("jquery-star:menu:close", { bubbles: true }));
    expect(root.dataset.state).toBe("open");
  });
  it("keeps newer parent close during listener acquisition", () => {
    const { ui } = install();
    const { root } = menuBarFixture();
    const add = root.addEventListener.bind(root);
    vi.spyOn(root, "addEventListener").mockImplementationOnce((type, listener, options) => {
      add(type, listener, options);
      ui.menubar.close(root);
    });
    ui.menubar.open(root, "second");
    expect(root.dataset.state).toBe("closed");
  });
  it("releases every listener when a removal fails", () => {
    const { ui, star } = install();
    const { root, triggers } = menuBarFixture();
    ui.enhance(root);
    const remove = root.removeEventListener.bind(root);
    const removed = vi.spyOn(required(triggers[1]), "removeEventListener");
    vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("menubar-remove");
    });
    try {
      expect(() => star.dispose()).toThrow();
      expect(removed).toHaveBeenCalled();
    } finally {
      stars.splice(stars.indexOf(star), 1);
      root.remove();
    }
  });
  it("releases a typeahead timer acquired after disposal", () => {
    const { ui, star } = install();
    const { root, triggers } = menuBarFixture();
    ui.enhance(root);
    const clear = vi.spyOn(window as Window, "clearTimeout");
    vi.spyOn(window as Window, "setTimeout").mockImplementationOnce(() => {
      star.dispose();
      return 910;
    });
    required(triggers[0]).dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    expect(clear).toHaveBeenCalledWith(910);
  });
});

it.each(["aria-disabled", "data-disabled"])(
  "Menubar child opening rechecks inherited %s",
  (attribute) => {
    const { ui } = install();
    const { root, menus } = menuBarFixture();
    ui.enhance(root);
    const opened = vi.fn();
    root.addEventListener("jquery-star:menu:open", opened);
    required(menus[1]).addEventListener(
      "jquery-star:menu:before-open",
      () => root.setAttribute(attribute, "true"),
      { once: true },
    );
    ui.menubar.open(root, "second");
    expect(ui.menubar.value(root)).toBeUndefined();
    expect(opened).not.toHaveBeenCalled();
  },
);

it.each([false, true])(
  "Menubar retains typeahead deadline and roving focus across adoption, disposed first=%s",
  (disposedFirst) => {
    const source = install();
    const destination = install(realm());
    const { root, triggers } = menuBarFixture();
    required(triggers[2]).textContent = "Baker";
    source.ui.enhance(root);
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    let previous: (() => void) | undefined;
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      previous = callback as () => void;
      return 920;
    });
    const clear = vi.spyOn(window as Window, "clearTimeout");
    required(triggers[0]).dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    expect(document.activeElement).toBe(triggers[1]);
    now = 1150;
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    const callbacks: Array<() => void> = [];
    vi.spyOn(destination.owner, "setTimeout").mockImplementation((callback, delay) => {
      delays.push(delay ?? 0);
      callbacks.push(callback as () => void);
      return 921;
    });
    destination.ui.enhance(root);
    source.star.dispose();
    expect(clear).toHaveBeenCalledWith(920);
    expect(delays).toEqual([350]);
    expect(destination.owner.document.activeElement).toBe(triggers[1]);
    required(previous)();
    required(triggers[1]).dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(destination.owner.document.activeElement).toBe(triggers[2]);
    required(callbacks.at(-1))();
    required(triggers[2]).dispatchEvent(new KeyboardEvent("keydown", { key: "o", bubbles: true }));
    expect(destination.owner.document.activeElement).toBe(triggers[0]);
  },
);

it.each(["aria-disabled", "data-disabled"])(
  "Menubar permits horizontal exploration from an inactive child %s item",
  (attribute) => {
    const { ui } = install();
    const { root, menus, triggers } = menuBarFixture();
    const item = required(required(menus[0]).querySelector<HTMLElement>('[data-part="item"]'));
    item.setAttribute(attribute, "true");
    ui.menubar.open(root, "first");
    expect(document.activeElement).toBe(item);
    item.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    expect(ui.menubar.value(root)).toBe("second");
    expect(required(triggers[1]).tabIndex).toBe(0);
  },
);

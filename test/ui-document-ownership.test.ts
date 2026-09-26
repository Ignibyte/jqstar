import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const installations: ReturnType<typeof installStarCore>["star"][] = [];
function install(owner: Window) {
  const jquery = jQueryFactory(owner);
  const installed = installStarCore(jquery, { document: owner.document });
  installations.push(installed.star);
  return {
    installed,
    star: installed.star,
    jquery,
    ui: installed.star.use(uiPlugin),
    window: owner,
  };
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  if (!frame.contentWindow) throw new Error("Missing fixture frame");
  return frame.contentWindow;
}
afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

type Kind = "countdown" | "carousel" | "message-scroller" | "dialog";
function fixture(owner: Window, kind: Kind) {
  const root = owner.document.createElement(kind === "dialog" ? "dialog" : "section");
  root.dataset.jqs = kind;
  root.id = "sample";
  if (kind === "countdown") {
    root.dataset.duration = "30";
    root.dataset.paused = "true";
    root.innerHTML = '<span data-part="seconds"></span>';
  } else if (kind === "carousel") {
    root.innerHTML =
      '<div data-part="content"><article data-part="slide" data-value="a">A</article><article data-part="slide" data-value="b">B</article></div><button data-part="next">Next</button>';
  } else if (kind === "message-scroller") {
    root.dataset.follow = "false";
    root.innerHTML =
      '<div data-part="viewport"><div data-part="content"></div></div><button data-part="latest">Latest</button>';
    const viewport = root.querySelector<HTMLElement>('[data-part="viewport"]');
    if (!viewport) throw new Error("Missing viewport");
    viewport.scrollTo = () => undefined;
  } else {
    root.innerHTML = '<h2 data-part="title">Dialog</h2><button autofocus>Confirm</button>';
    const dialog = root as HTMLDialogElement;
    dialog.showModal = () => dialog.setAttribute("open", "");
    dialog.close = () => {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new (owner as Window & typeof globalThis).Event("close"));
    };
  }
  owner.document.body.append(root);
  return root;
}
function operate(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: Kind,
  target: HTMLElement | string,
) {
  if (kind === "countdown") return ui.countdown.state(target).paused;
  if (kind === "carousel") {
    ui.carousel.next(target);
    return ui.carousel.value(target) === "b";
  }
  if (kind === "message-scroller") return !ui.messageScroller.isFollowing(target);
  return ui.dialog.open(target as HTMLDialogElement | string).open;
}

describe.each(["countdown", "carousel", "message-scroller", "dialog"] as const)(
  "%s document ownership",
  (kind) => {
    it.each(["element", "selector"] as const)(
      "uses a foreign installation through its %s facade",
      (target) => {
        const owner = realm();
        const { ui } = install(owner);
        const root = fixture(owner, kind);
        ui.enhance(owner.document);
        expect(operate(ui, kind, target === "element" ? root : "#sample")).toBe(true);
        expect(root.dataset.state).toBeDefined();
      },
    );

    it("enhances an explicit foreign root", () => {
      const owner = realm();
      const { ui } = install(owner);
      const root = fixture(owner, kind);
      ui.enhance(root);
      expect(root.dataset.state).toBeDefined();
    });

    it("automatically enhances a root appended in its owning document", async () => {
      const owner = realm();
      const { star } = install(owner);
      await star.whenEnhanced();
      const root = fixture(owner, kind);
      await star.whenEnhanced();
      expect(root.dataset.state).toBeDefined();
    });

    it("reacquires an adopted root in the destination and rejects its former facade", async () => {
      const source = install(window);
      const destination = install(realm());
      const root = fixture(window, kind);
      source.ui.enhance(root);
      if (kind === "dialog") source.ui.dialog.open(root as HTMLDialogElement);
      destination.window.document.body.append(destination.window.document.adoptNode(root));
      expect(() => operate(source.ui, kind, root)).toThrow("unavailable");
      destination.ui.enhance(root);
      expect(operate(destination.ui, kind, root)).toBe(true);
      source.star.dispose();
      expect(operate(destination.ui, kind, root)).toBe(true);
      await destination.star.whenEnhanced();
    });
  },
);

it("accepts adopted render roots, preserved boundaries, incoming roots and later removal", async () => {
  const destination = install(window);
  const foreign = realm();
  const main = foreign.document.createElement("main");
  const root = fixture(foreign, "countdown");
  main.append(root);
  document.body.append(document.adoptNode(main));
  destination.ui.enhance(main);
  const adapter = createRenderAdapter(destination.installed);
  const preserved = adapter.begin(main, { preserveRoots: [root] });
  expect(preserved.preservedWithin(root)).toEqual([root]);
  preserved.beforeRemove(root);
  root.remove();
  main.append(root);
  await preserved.commit();
  const removed = adapter.begin(main);
  removed.beforeRemove(root);
  expect(() => destination.ui.countdown.state(root)).toThrow("unavailable");
  root.remove();
  await removed.commit();
});

it("keeps invalid and wrong-document targets outside the UI facade", () => {
  const { ui } = install(window);
  const foreign = fixture(realm(), "countdown");
  const fake = {
    nodeType: 1,
    ownerDocument: document,
    matches: () => true,
  } as unknown as HTMLElement;
  expect(() => ui.countdown.state(foreign)).toThrow("unavailable");
  expect(() => ui.countdown.state(fake)).toThrow("unavailable");
  expect(() => ui.enhance(fake)).toThrow("unavailable");
});

it.each(["countdown", "carousel", "message-scroller", "dialog"] as const)(
  "runs %s private actions in an independent document",
  async (kind) => {
    const owner = realm();
    const { jquery, star, ui } = install(owner);
    const root = fixture(owner, kind);
    const app = owner.document.createElement("main");
    const button = owner.document.createElement("button");
    const action =
      kind === "countdown"
        ? "@ui.countdown.start(7)"
        : kind === "carousel"
          ? "@ui.carousel.go('b')"
          : kind === "message-scroller"
            ? "@ui.message-scroller.latest()"
            : "@ui.dialog.open('#sample')";
    button.setAttribute("data-on:click", action);
    if (kind === "dialog") {
      button.setAttribute("aria-controls", root.id);
      app.append(button);
    } else root.append(button);
    app.append(root);
    owner.document.body.append(app);
    jquery(app).star();
    button.click();
    await star.whenEnhanced();
    if (kind === "countdown") expect(ui.countdown.state(root).remaining).toBe(7);
    else if (kind === "carousel") expect(ui.carousel.value(root)).toBe("b");
    else if (kind === "message-scroller") expect(ui.messageScroller.isFollowing(root)).toBe(true);
    else expect((root as HTMLDialogElement).open).toBe(true);
  },
);

it("boots an adopted incoming application at render commit", async () => {
  const owner = install(window);
  const incoming = realm().document.createElement("section");
  incoming.setAttribute("data-signals", "{ count: 3 }");
  incoming.innerHTML = '<span data-text="$count"></span>';
  const main = document.createElement("main");
  document.body.append(main);
  const operation = createRenderAdapter(owner.installed).begin(main);
  main.append(document.adoptNode(incoming));
  await operation.commit([incoming]);
  expect(owner.jquery(incoming).star("instance")).toBeDefined();
  expect(incoming.textContent).toBe("3");
});

it("uses adopted checkbox and multiple-select native values in reactive bindings", async () => {
  const owner = install(window);
  const form = realm().document.createElement("form");
  form.setAttribute("data-signals", "{ enabled: false, choices: ['a'] }");
  form.innerHTML =
    '<input type="checkbox" data-bind:enabled><select multiple data-bind:choices><option value="a">A</option><option value="b">B</option></select>';
  document.body.append(document.adoptNode(form));
  owner.jquery(form).star();
  const input = form.querySelector<HTMLInputElement>("input");
  const select = form.querySelector<HTMLSelectElement>("select");
  if (!input || !select) throw new Error("Missing native controls");
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  select.options[0]?.removeAttribute("selected");
  const first = select.options[0];
  const second = select.options[1];
  if (!first || !second) throw new Error("Missing native options");
  first.selected = false;
  second.selected = true;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await owner.star.whenEnhanced();
  expect(owner.jquery(form).star("state")).toMatchObject({ enabled: true, choices: ["b"] });
});

it.each(["carousel", "message-scroller"] as const)(
  "%s reacquires through the destination facade before an enhancement barrier",
  (kind) => {
    const source = install(window);
    const destination = install(realm());
    const root = fixture(window, kind);
    source.ui.enhance(root);
    destination.window.document.body.append(destination.window.document.adoptNode(root));
    if (kind === "carousel") {
      destination.ui.carousel.next(root);
      expect(destination.ui.carousel.value(root)).toBe("b");
    } else {
      destination.ui.messageScroller.follow(root, true);
      expect(destination.ui.messageScroller.isFollowing(root)).toBe(true);
    }
  },
);

it("does not repeatedly write Carousel disabled state during unchanged enhancement", () => {
  const { ui } = install(window);
  const root = fixture(window, "carousel");
  ui.enhance(root);
  ui.carousel.next(root);
  const next = root.querySelector<HTMLButtonElement>('[data-part="next"]');
  if (!next) throw new Error("Missing next control");
  const writes = vi.spyOn(next, "disabled", "set");
  ui.enhance(root);
  ui.enhance(root);
  expect(writes).not.toHaveBeenCalled();
});

it.each([false, true])(
  "Carousel recalculates focus pause after adoption while retaining user pause=%s",
  (userPaused) => {
    const source = install(window);
    const destination = install(realm());
    const root = fixture(window, "carousel");
    root.dataset.autoplay = "1000";
    source.ui.enhance(root);
    root.querySelector<HTMLButtonElement>("button")?.focus();
    if (userPaused) source.ui.carousel.pause(root);
    expect(root.dataset.rotation).toBe("paused");
    destination.window.document.body.append(destination.window.document.adoptNode(root));
    destination.ui.enhance(root);
    expect(root.dataset.rotation).toBe(userPaused ? "paused" : "playing");
  },
);

it("Carousel respects native focus already inside a newly enhanced foreign root", () => {
  const owner = realm();
  const { ui } = install(owner);
  const root = fixture(owner, "carousel");
  root.dataset.autoplay = "1000";
  root.querySelector<HTMLButtonElement>("button")?.focus();
  ui.enhance(root);
  expect(root.dataset.rotation).toBe("paused");
});

it("Message Scroller observes newly appended destination nodes after adoption", async () => {
  const source = install(window);
  const destination = install(realm());
  const root = fixture(window, "message-scroller");
  source.ui.enhance(root);
  destination.window.document.body.append(destination.window.document.adoptNode(root));
  destination.ui.enhance(root);
  const events: Event[] = [];
  root.addEventListener("jquery-star:message-scroller:messages", (event) => events.push(event));
  const message = destination.window.document.createElement("article");
  message.dataset.jqs = "message";
  root.querySelector('[data-part="content"]')?.append(message);
  await destination.star.whenEnhanced();
  expect(destination.ui.messageScroller.unread(root)).toBe(1);
  expect(events).toHaveLength(1);
  expect(events[0]).toBeInstanceOf((destination.window as Window & typeof globalThis).CustomEvent);
});

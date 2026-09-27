import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { withStarDOMRealm } from "../src/testing";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};

type Installation = ReturnType<typeof installStarCore>;
const installations: Installation["star"][] = [];

function install() {
  const installed = installStarCore($, { document });
  installations.push(installed.star);
  return { installed, star: installed.star, ui: installed.star.use(uiPlugin) };
}

const markup = {
  carousel:
    '<section id="sample" data-jqs="carousel" data-autoplay="1000" data-loop><div data-part="content"><article data-part="slide" data-value="a">A</article><article data-part="slide" data-value="b">B</article></div><button data-part="next">Next</button></section>',
  countdown:
    '<section id="sample" data-jqs="countdown" data-duration="10"><span data-part="seconds"></span></section>',
  "message-scroller":
    '<section id="sample" data-jqs="message-scroller"><div data-part="viewport"><div data-part="content"></div></div><button data-part="latest">Latest</button></section>',
};

function fixture(kind: keyof typeof markup) {
  const main = document.createElement("main");
  main.innerHTML = markup[kind];
  document.body.append(main);
  const root = main.querySelector<HTMLElement>("section");
  if (!root) throw new Error("Missing fixture root.");
  return { main, root };
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
});

afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

for (const kind of ["carousel", "countdown", "message-scroller"] as const) {
  it.each(["render", "native", "dispose"])(`releases ${kind} work at %s removal`, async (mode) => {
    const { installed, star, ui } = install();
    const { main, root } = fixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    expect(vi.getTimerCount()).toBe(1);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    root.addEventListener(`jquery-star:${kind}:messages`, changed);
    root.addEventListener(`jquery-star:${kind}:complete`, changed);
    if (mode === "dispose") star.dispose();
    else if (mode === "native") {
      root.remove();
      await star.whenEnhanced();
    } else {
      const render = createRenderAdapter(installed).begin(main);
      render.beforeRemove(root);
      expect(root.isConnected).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      // An attribute mutation delivered before the host finishes removal must stay inert.
      root.dataset.value = "a";
      await Promise.resolve();
      expect(vi.getTimerCount()).toBe(0);
      root.remove();
      await render.commit();
    }
    expect(vi.getTimerCount()).toBe(0);
    const prior = root.innerHTML;
    root.querySelector<HTMLElement>('[data-part="next"]')?.click();
    if (kind === "message-scroller") {
      const content = root.querySelector('[data-part="content"]');
      const message = document.createElement("p");
      message.dataset.jqs = "message";
      content?.append(message);
      await Promise.resolve();
    }
    vi.advanceTimersByTime(20_000);
    expect(changed).not.toHaveBeenCalled();
    if (kind !== "message-scroller") expect(root.innerHTML).toBe(prior);
    expect(vi.getTimerCount()).toBe(0);
  });

  it(`retains ${kind} work through an explicit preserved move`, async () => {
    const { installed, star, ui } = install();
    const { main, root } = fixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    const render = createRenderAdapter(installed).begin(main, { preserveRoots: [root] });
    render.beforeRemove(root);
    expect(vi.getTimerCount()).toBe(1);
    root.remove();
    await Promise.resolve();
    main.append(root);
    await render.commit();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1_000);
    if (kind === "carousel") expect(root.dataset.value).toBe("b");
    if (kind === "countdown") expect(root.textContent).toBe("09");
    star.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
}

it("rejects every retained facade method after disposal and after reinstall", async () => {
  const first = install();
  await first.star.whenEnhanced();
  first.star.dispose();
  const { root } = fixture("carousel");
  const assertRetired = () => {
    for (const api of Object.values(first.ui)) {
      if (typeof api === "function") expect(() => api(root)).toThrow("disposed");
      else
        for (const call of Object.values(api)) {
          if (typeof call !== "function") throw new Error("Unexpected non-callable UI method.");
          expect(() => call(root)).toThrow("disposed");
        }
    }
  };
  assertRetired();
  expect(vi.getTimerCount()).toBe(0);
  const second = install();
  second.ui.carousel.play(root);
  await second.star.whenEnhanced();
  expect(vi.getTimerCount()).toBe(1);
  assertRetired();
  expect(second.ui.carousel.value(root)).toBe("a");
});

it("refuses resources through a facade escaped from failed installation", () => {
  const installed = installStarCore($, { document });
  installations.push(installed.star);
  let escaped: ReturnType<typeof uiPlugin.install> | undefined;
  // A later activation fails after the UI installer has returned its facade.
  const original = uiPlugin.install;
  const failed = {
    ...uiPlugin,
    name: "review.failed-ui",
    install: (registrar: Parameters<typeof original>[0]) => {
      escaped = original(registrar);
      registrar.activate(() => {
        throw new Error("late activation failed");
      });
      return escaped;
    },
  };
  expect(() => installed.star.use(failed)).toThrow();
  const { root } = fixture("carousel");
  expect(escaped).toBeDefined();
  expect(() => escaped?.carousel.play(root)).toThrow("disposed");
  expect(vi.getTimerCount()).toBe(0);
});

it("does not restart Carousel work after disposal inside before-change", async () => {
  const { star, ui } = install();
  const { root } = fixture("carousel");
  ui.enhance(root);
  await star.whenEnhanced();
  const changed = vi.fn();
  root.addEventListener("jquery-star:carousel:before-change", () => star.dispose());
  root.addEventListener("jquery-star:carousel:change", changed);
  vi.advanceTimersByTime(1_000);
  expect(changed).not.toHaveBeenCalled();
  expect(root.dataset.value).toBe("a");
  expect(vi.getTimerCount()).toBe(0);
});

it("refuses UI acquisition from cleanup before the UI service itself is released", () => {
  const { star, ui } = install();
  const cleanup = vi.fn(() => {
    expect(() => ui.toast.show("late")).toThrow("unavailable");
    expect(() => ui.enhance(document)).toThrow("unavailable");
  });
  star.use({
    name: "review.cleanup",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar) {
      registrar.documentHost.own("service", "review:cleanup", cleanup);
    },
  });
  star.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
  expect(document.querySelector('[data-jqs="toast"]')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("keeps timers in their owning documents when disposal runs from another realm", async () => {
  const frames: HTMLIFrameElement[] = [];
  const owners: Array<{ star: Installation["star"]; timers: Set<number> }> = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      frames.push(frame);
      const owner = frame.contentWindow;
      if (!owner) throw new Error("Missing iframe window.");
      const jquery = jQueryFactory(owner);
      const timers = new Set<number>();
      let id = 0;
      const start = () => {
        timers.add(++id);
        return id;
      };
      vi.spyOn(owner, "setTimeout").mockImplementation(start);
      vi.spyOn(owner, "setInterval").mockImplementation(start);
      vi.spyOn(owner, "clearTimeout").mockImplementation((timer) => {
        timers.delete(Number(timer));
      });
      vi.spyOn(owner, "clearInterval").mockImplementation((timer) => {
        timers.delete(Number(timer));
      });
      await withStarDOMRealm(
        { window: owner as Window & typeof globalThis, jQuery: jquery },
        async () => {
          const installed = installStarCore(jquery, { document: owner.document });
          const star = installed.star;
          owners.push({ star, timers });
          const ui = star.use(uiPlugin);
          owner.document.body.innerHTML = Object.values(markup).join("");
          ui.enhance(owner.document);
          await star.whenEnhanced();
          expect(timers.size).toBe(3);
        },
      );
    }
    const [first, second] = owners;
    if (!first || !second) throw new Error("Missing installations.");
    first.star.dispose();
    expect(first.timers.size).toBe(0);
    expect(second.timers.size).toBe(3);
    second.star.dispose();
    expect(second.timers.size).toBe(0);
  } finally {
    for (const { star } of owners) star.dispose();
    for (const frame of frames) frame.remove();
  }
});

import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { createRenderAdapter } from "../src/render-adapter";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
type Kind = "json-viewer" | "log-viewer";
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing viewer fixture part");
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
function fixture(kind: Kind, owner: Window = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "viewer";
  root.className = "viewer-target";
  root.innerHTML =
    kind === "json-viewer"
      ? '<script type="application/json" data-part="source">{"initial":{"value":1},"other":{"value":2}}</script><div data-part="tree"></div><p data-part="status"></p>'
      : '<select data-part="filter"><option>all</option><option>error</option></select><button data-part="pause"></button><div data-part="viewport"><ol data-part="entries"><li data-part="entry" data-level="info">Initial</li></ol></div><p data-part="status"></p>';
  return root;
}
function part(root: HTMLElement, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function branches(root: HTMLElement): HTMLDetailsElement[] {
  return Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-part="branch"]'));
}
function scrollSize(view: HTMLElement, height = 1000): void {
  Object.defineProperties(view, {
    scrollHeight: { configurable: true, value: height },
    clientHeight: { configurable: true, value: 100 },
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

describe.each(["json-viewer", "log-viewer"] as const)("%s document ownership", (kind) => {
  it("uses its foreign facade and owning-window events", () => {
    const { owner, ui } = install(realm());
    const root = fixture(kind, owner);
    const events: Event[] = [];
    root.addEventListener(
      `jquery-star:${kind}:${kind === "json-viewer" ? "update" : "pause"}`,
      (event) => events.push(event),
    );
    if (kind === "json-viewer")
      expect(ui.jsonViewer.value(root)).toEqual({ initial: { value: 1 }, other: { value: 2 } });
    else {
      expect(ui.logViewer.state(root).count).toBe(1);
      ui.logViewer.pause(root);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
  });
  it("automatically enhances a foreign document", async () => {
    const { owner, star } = install(realm());
    await star.whenEnhanced();
    const root = fixture(kind, owner);
    owner.document.body.append(root);
    await star.whenEnhanced();
    expect(root.dataset.state).toBe(kind === "json-viewer" ? "ready" : "live");
    expect(part(root, "status").textContent).not.toBe("");
  });
  it.each(["implicit", "selector", "class", "element"] as const)(
    "supports a foreign %s action with the root as application",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const root = fixture(kind, owner);
      const app = required(jquery(root).star().star("instance"));
      const args =
        mode === "implicit"
          ? []
          : [mode === "element" ? root : mode === "class" ? ".viewer-target" : "#viewer"];
      await app.run(kind === "json-viewer" ? "ui.json-viewer.expand-all" : "ui.log-viewer.pause", {
        args,
      });
      expect(root.dataset[kind === "json-viewer" ? "expanded" : "state"]).toBe(
        kind === "json-viewer" ? "true" : "paused",
      );
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains state after adoption through %s",
    (mode) => {
      const source = install();
      const target = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      if (kind === "json-viewer") {
        required(branches(root)[0]).open = false;
        required(branches(root)[1]).open = true;
      } else {
        source.ui.logViewer.pause(root);
        source.ui.logViewer.follow(root, false);
      }
      const tree = kind === "json-viewer" ? part(root, "tree").firstElementChild : undefined;
      target.owner.document.body.append(target.owner.document.adoptNode(root));
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") {
        if (kind === "json-viewer") target.ui.jsonViewer.value(root);
        else target.ui.logViewer.state(root);
      } else target.ui.enhance(root);
      source.star.dispose();
      if (kind === "json-viewer") {
        expect(part(root, "tree").firstElementChild).toBe(tree);
        expect(branches(root).map((branch) => branch.open)).toEqual([false, true, false]);
        target.ui.jsonViewer.collapseAll(root);
        expect(branches(root).every((branch) => !branch.open)).toBe(true);
      } else {
        expect(target.ui.logViewer.state(root)).toMatchObject({
          paused: true,
          following: false,
          count: 1,
        });
        const filter = part(root, "filter") as HTMLSelectElement;
        filter.value = "error";
        filter.dispatchEvent(
          new (target.owner as Window & typeof globalThis).Event("change", { bubbles: true }),
        );
        expect(target.ui.logViewer.state(root).filter).toBe("error");
      }
    },
  );
  it("ignores a nested controller's parts", () => {
    const { ui } = install();
    const root = fixture(kind);
    const nested = fixture(kind);
    nested.dataset.jqs = "native-test";
    nested.id = "nested-viewer";
    root.prepend(nested);
    ui.enhance(root);
    expect(part(nested, "status").textContent).toBe("");
    expect(root.querySelector<HTMLElement>(':scope > [data-part="status"]')?.textContent).not.toBe(
      "",
    );
  });
  it.each(["render", "preserve"] as const)("respects %s removal ownership", async (mode) => {
    const { ui, jquery, star } = install();
    const host = document.createElement("main");
    const root = fixture(kind);
    host.append(root);
    document.body.append(host);
    ui.enhance(root);
    await star.whenEnhanced();
    const adapter = createRenderAdapter(jquery);
    const render = adapter.begin(host, mode === "preserve" ? { preserveRoots: [root] } : {});
    render.beforeRemove(root);
    const change = () =>
      kind === "json-viewer"
        ? ui.jsonViewer.set(root, { updated: true })
        : ui.logViewer.append(root, { message: "updated" });
    if (mode === "render") {
      expect(change).toThrow();
      root.remove();
    } else {
      root.remove();
      change();
      host.append(root);
    }
    await render.commit();
    if (mode === "preserve") expect(root.textContent).toContain("updated");
  });
});

it.each(["source", "tree", "status"] as const)("JSON facade refreshes replaced %s", (name) => {
  const { ui } = install();
  const root = fixture("json-viewer");
  ui.enhance(root);
  const old = part(root, name);
  const next = old.cloneNode(false) as HTMLElement;
  if (name === "source") next.textContent = '{"replacement":2}';
  old.replaceWith(next);
  const value = ui.jsonViewer.value(root);
  expect(value).toEqual(
    name === "source" ? { replacement: 2 } : { initial: { value: 1 }, other: { value: 2 } },
  );
  expect(part(root, "tree").textContent).not.toBe("");
  expect(part(root, "status").textContent).not.toBe("");
});
it.each(["return", "throw"] as const)(
  "JSON newer serializer work survives an older %s",
  (outcome) => {
    const { ui } = install();
    const root = fixture("json-viewer");
    ui.enhance(root);
    const error = new Error("old serializer");
    const failed = vi.fn();
    root.addEventListener("jquery-star:json-viewer:error", failed);
    const value = {
      toJSON() {
        ui.jsonViewer.set(root, { newer: true });
        if (outcome === "throw") throw error;
        return { older: true };
      },
    };
    if (outcome === "throw") expect(() => ui.jsonViewer.set(root, value)).toThrow(error);
    else ui.jsonViewer.set(root, value);
    expect(ui.jsonViewer.value(root)).toEqual({ newer: true });
    expect(failed).not.toHaveBeenCalled();
  },
);
it("JSON initial enhancement reentry supersedes the older setter", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  const serialize = vi.fn(() => ({ older: true }));
  root.addEventListener(
    "jquery-star:json-viewer:update",
    () => ui.jsonViewer.set(root, { newer: true }),
    { once: true },
  );
  ui.jsonViewer.set(root, { toJSON: serialize });
  expect(serialize).not.toHaveBeenCalled();
  expect(ui.jsonViewer.value(root)).toEqual({ newer: true });
});
it("JSON refreshes changed depth and expanded configuration without a new source", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  root.dataset.maxDepth = "1";
  ui.enhance(root);
  expect(root.querySelector('[data-type="truncated"]')).not.toBeNull();
  root.dataset.maxDepth = "5";
  ui.enhance(root);
  expect(root.querySelector('[data-type="truncated"]')).toBeNull();
  root.dataset.expanded = "true";
  ui.enhance(root);
  expect(branches(root).every((branch) => branch.open)).toBe(true);
  root.dataset.expanded = "false";
  ui.enhance(root);
  expect(branches(root).every((branch) => !branch.open)).toBe(true);
});
it("JSON preserves native closed and open branches while source values change", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  ui.enhance(root);
  required(branches(root)[0]).open = false;
  required(branches(root)[1]).open = true;
  ui.jsonViewer.set(root, { initial: { value: 3 }, other: { value: 4 } });
  expect(branches(root).map((branch) => branch.open)).toEqual([false, true, false]);
});
it("JSON returns defensive values and keeps null normalization", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  const copy = ui.jsonViewer.value(root) as { initial: { value: number } };
  copy.initial.value = 20;
  expect(ui.jsonViewer.value(root)).toMatchObject({ initial: { value: 1 } });
  ui.jsonViewer.set(root, undefined);
  expect(ui.jsonViewer.value(root)).toBeNull();
});
it.each(["dispose", "collapse"] as const)(
  "JSON stops an expand loop after a branch setter requests %s",
  (operation) => {
    const { ui, star } = install();
    const root = fixture("json-viewer");
    ui.enhance(root);
    ui.jsonViewer.collapseAll(root);
    const nodes = branches(root);
    const set = required(
      Object.getOwnPropertyDescriptor(HTMLDetailsElement.prototype, "open")?.set,
    );
    vi.spyOn(required(nodes[0]), "open", "set").mockImplementationOnce((value) => {
      set.call(nodes[0], value);
      if (operation === "dispose") star.dispose();
      else ui.jsonViewer.collapseAll(root);
    });
    ui.jsonViewer.expandAll(root);
    expect(nodes.slice(1).every((branch) => !branch.open)).toBe(true);
    if (operation === "collapse") expect(nodes.every((branch) => !branch.open)).toBe(true);
  },
);
it("JSON does not turn interrupted rendering into a parse error", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  ui.enhance(root);
  const tree = part(root, "tree");
  const replace = tree.replaceChildren.bind(tree);
  const error = vi.fn();
  root.addEventListener("jquery-star:json-viewer:error", error);
  vi.spyOn(tree, "replaceChildren").mockImplementationOnce((...nodes) => {
    replace(...nodes);
    ui.jsonViewer.set(root, { newer: true });
  });
  ui.jsonViewer.set(root, { older: true });
  expect(ui.jsonViewer.value(root)).toEqual({ newer: true });
  expect(root.dataset.state).toBe("ready");
  expect(error).not.toHaveBeenCalled();
});

it.each(["entries", "viewport", "filter", "pause", "status"] as const)(
  "Log facade refreshes replaced %s",
  (name) => {
    const { ui } = install();
    const root = fixture("log-viewer");
    ui.enhance(root);
    ui.logViewer.pause(root);
    ui.logViewer.follow(root, false);
    const old = part(root, name);
    const next = part(fixture("log-viewer"), name);
    old.replaceWith(next);
    ui.logViewer.append(root, { message: "current" });
    expect(part(root, "entries").textContent).toContain("current");
    expect(part(root, "status").textContent).toContain("Paused");
    expect(part(root, "pause").getAttribute("aria-pressed")).toBe("true");
    const filter = part(root, "filter") as HTMLSelectElement;
    filter.value = "error";
    filter.dispatchEvent(new Event("change"));
    expect(ui.logViewer.state(root)).toMatchObject({
      filter: "error",
      following: false,
      paused: true,
    });
  },
);
it.each(["clear", "append", "filter"] as const)(
  "Log newer %s supersedes an older append callback",
  (operation) => {
    const { ui } = install();
    const root = fixture("log-viewer");
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:log-viewer:before-append",
      () => {
        if (operation === "clear") ui.logViewer.clear(root);
        else if (operation === "append") ui.logViewer.append(root, { message: "newer" });
        else ui.logViewer.filter(root, "error");
      },
      { once: true },
    );
    ui.logViewer.append(root, { message: "older" });
    expect(part(root, "entries").textContent).not.toContain("older");
    if (operation === "clear") expect(ui.logViewer.state(root).count).toBe(0);
    if (operation === "append") expect(part(root, "entries").textContent).toContain("newer");
  },
);
it("Log newer append supersedes an older clear callback", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  ui.enhance(root);
  root.addEventListener(
    "jquery-star:log-viewer:before-clear",
    () => ui.logViewer.append(root, { message: "newer" }),
    { once: true },
  );
  ui.logViewer.clear(root);
  expect(part(root, "entries").textContent).toContain("newer");
});
it.each(["dispose", "append"] as const)(
  "Log input getters stop older work after %s",
  (operation) => {
    const { ui, star } = install();
    const root = fixture("log-viewer");
    ui.enhance(root);
    const before = vi.fn();
    root.addEventListener("jquery-star:log-viewer:before-append", before);
    ui.logViewer.append(root, {
      get message() {
        if (operation === "dispose") star.dispose();
        else ui.logViewer.append(root, { message: "newer" });
        return "older";
      },
    });
    expect(part(root, "entries").textContent).not.toContain("older");
    expect(before).toHaveBeenCalledTimes(operation === "dispose" ? 0 : 1);
  },
);
it("Log pause retains incoming data while disabling announcements", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  ui.logViewer.pause(root);
  ui.logViewer.append(root, { message: "received" });
  expect(part(root, "entries").textContent).toContain("received");
  expect(part(root, "viewport").getAttribute("aria-live")).toBe("off");
});
it("Log releases its first listener when second registration throws", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  const filter = part(root, "filter");
  const view = part(root, "viewport");
  const remove = vi.spyOn(filter, "removeEventListener");
  vi.spyOn(view, "addEventListener").mockImplementationOnce(() => {
    throw new Error("registration failed");
  });
  expect(() => ui.enhance(root)).toThrow("registration failed");
  expect(remove.mock.calls.filter(([name]) => name === "change")).toHaveLength(1);
});
it("Log balances late listener acquisition after disposal", () => {
  const { ui, star } = install();
  const root = fixture("log-viewer");
  const filter = part(root, "filter");
  const add = filter.addEventListener.bind(filter);
  const remove = vi.spyOn(filter, "removeEventListener");
  vi.spyOn(filter, "addEventListener").mockImplementationOnce((type, listener, options) => {
    star.dispose();
    add(type, listener, options);
  });
  ui.enhance(root);
  expect(remove.mock.calls.some(([name]) => name === "change")).toBe(true);
});
it("Log sweeps other listener cleanup when the first remover throws", () => {
  const { ui, star } = install();
  const root = fixture("log-viewer");
  ui.enhance(root);
  const filter = part(root, "filter");
  const view = part(root, "viewport");
  const remove = filter.removeEventListener.bind(filter);
  const viewRemove = vi.spyOn(view, "removeEventListener");
  vi.spyOn(filter, "removeEventListener").mockImplementationOnce((...args) => {
    remove(...args);
    throw new Error("remove failed");
  });
  try {
    expect(() => star.dispose()).toThrow();
    expect(viewRemove.mock.calls.some(([name]) => name === "scroll")).toBe(true);
  } finally {
    stars.splice(stars.indexOf(star), 1);
  }
});
it.each(["data", "aria", "inert", "native", "fieldset", "canceled"] as const)(
  "Log ignores %s native filter interaction",
  (constraint) => {
    const { ui } = install();
    const root = fixture("log-viewer");
    ui.enhance(root);
    const filter = part(root, "filter") as HTMLSelectElement;
    if (constraint === "data") root.dataset.disabled = "true";
    if (constraint === "aria") root.setAttribute("aria-disabled", "true");
    if (constraint === "inert") root.setAttribute("inert", "");
    if (constraint === "native") filter.disabled = true;
    if (constraint === "fieldset") {
      const fieldset = document.createElement("fieldset");
      fieldset.disabled = true;
      root.append(fieldset);
      fieldset.append(filter);
    }
    const event = new Event("change", { bubbles: true, cancelable: true });
    if (constraint === "canceled") event.preventDefault();
    filter.value = "error";
    filter.dispatchEvent(event);
    expect(ui.logViewer.state(root).filter).toBe("all");
  },
);
it("Log ignores stale queued scroll after adoption", () => {
  const source = install();
  const target = install(realm());
  const root = fixture("log-viewer");
  document.body.append(root);
  const oldPending: VoidFunction[] = [];
  const newPending: VoidFunction[] = [];
  vi.spyOn(window, "queueMicrotask").mockImplementation((callback) => oldPending.push(callback));
  vi.spyOn(target.owner, "queueMicrotask").mockImplementation((callback) =>
    newPending.push(callback),
  );
  scrollSize(part(root, "viewport"));
  source.ui.enhance(root);
  target.owner.document.body.append(target.owner.document.adoptNode(root));
  target.ui.enhance(root);
  source.star.dispose();
  for (const callback of oldPending) callback();
  expect(part(root, "viewport").scrollTop).toBe(0);
  for (const callback of newPending) callback();
  expect(part(root, "viewport").scrollTop).toBe(1000);
});
it("Log guards the scroll write after a layout getter retires its owner", () => {
  const { ui, star } = install();
  const root = fixture("log-viewer");
  document.body.append(root);
  const view = part(root, "viewport");
  const pending: VoidFunction[] = [];
  vi.spyOn(window, "queueMicrotask").mockImplementation((callback) => pending.push(callback));
  Object.defineProperty(view, "scrollHeight", {
    configurable: true,
    get() {
      star.dispose();
      return 1000;
    },
  });
  ui.enhance(root);
  for (const callback of pending) callback();
  expect(view.scrollTop).toBe(0);
});

it.each(["json-viewer", "log-viewer"] as const)(
  "%s ignores constrained action triggers",
  async (kind) => {
    const { ui, jquery } = install();
    const root = fixture(kind);
    const trigger = document.createElement("button");
    trigger.textContent = "Action";
    root.append(trigger);
    ui.enhance(root);
    const app = required(jquery(root).star().star("instance"));
    const initial =
      kind === "json-viewer"
        ? branches(root).map((branch) => branch.open)
        : ui.logViewer.state(root).paused;
    for (const constraint of ["data", "aria", "inert", "fieldset"] as const) {
      if (constraint === "data") root.dataset.disabled = "true";
      if (constraint === "aria") trigger.setAttribute("aria-disabled", "true");
      if (constraint === "inert") root.setAttribute("inert", "");
      let fieldset: HTMLFieldSetElement | undefined;
      if (constraint === "fieldset") {
        fieldset = document.createElement("fieldset");
        fieldset.disabled = true;
        root.append(fieldset);
        fieldset.append(trigger);
      }
      try {
        await app.run(
          kind === "json-viewer" ? "ui.json-viewer.expand-all" : "ui.log-viewer.pause",
          { element: trigger, args: [root] },
        );
        expect(
          kind === "json-viewer"
            ? branches(root).map((branch) => branch.open)
            : ui.logViewer.state(root).paused,
        ).toEqual(initial);
      } finally {
        delete root.dataset.disabled;
        trigger.removeAttribute("aria-disabled");
        root.removeAttribute("inert");
        if (fieldset) {
          root.append(trigger);
          fieldset.remove();
        }
      }
    }
  },
);
it.each(["implicit", "explicit"] as const)(
  "Log preserves foreign filter and follow action argument order: %s",
  async (mode) => {
    const { ui, owner, jquery } = install(realm());
    const root = fixture("log-viewer", owner);
    const filter = part(root, "filter") as HTMLSelectElement;
    ui.enhance(root);
    const app = required(jquery(root).star().star("instance"));
    filter.value = "error";
    await app.run("ui.log-viewer.filter", {
      element: filter,
      args: mode === "explicit" ? ["error", "#viewer"] : [],
    });
    expect(ui.logViewer.state(root).filter).toBe("error");
    await app.run("ui.log-viewer.follow", {
      element: filter,
      args: mode === "explicit" ? [false, ".viewer-target"] : [false],
    });
    expect(ui.logViewer.state(root).following).toBe(false);
  },
);
it("Log keeps generated entry IDs unique while trimming old entries", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  root.dataset.max = "3";
  ui.enhance(root);
  for (let i = 0; i < 6; i += 1) ui.logViewer.append(root, { message: `entry ${i}` });
  const ids = Array.from(part(root, "entries").children, (entry) => entry.id);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
});
it("JSON reports DOM rendering failure to its caller and retries unchanged input", () => {
  const { ui } = install();
  const root = fixture("json-viewer");
  ui.enhance(root);
  const tree = part(root, "tree");
  const failed = vi.fn();
  root.addEventListener("jquery-star:json-viewer:error", failed);
  const error = new Error("DOM insertion failed");
  vi.spyOn(tree, "replaceChildren").mockImplementationOnce(() => {
    throw error;
  });
  expect(() => ui.jsonViewer.set(root, { next: true })).toThrow(error);
  expect(failed).not.toHaveBeenCalled();
  ui.enhance(root);
  expect(ui.jsonViewer.value(root)).toEqual({ next: true });
  expect(tree.textContent).toContain("next");
});
it.each(["expandAll", "collapseAll"] as const)(
  "JSON refreshes configuration after a nested %s during tree insertion",
  (method) => {
    const { ui } = install();
    const root = fixture("json-viewer");
    ui.enhance(root);
    const tree = part(root, "tree");
    const replace = tree.replaceChildren.bind(tree);
    vi.spyOn(tree, "replaceChildren").mockImplementationOnce((...nodes) => {
      replace(...nodes);
      ui.jsonViewer[method](root);
    });
    ui.jsonViewer.set(root, { next: { value: 2 } });
    expect(branches(root).map((branch) => branch.open)).toEqual(
      method === "expandAll" ? [true, true] : [false, false],
    );
    delete root.dataset.expanded;
    ui.enhance(root);
    expect(branches(root).map((branch) => branch.open)).toEqual([true, false]);
    expect(ui.jsonViewer.value(root)).toEqual({ next: { value: 2 } });
  },
);
it("Log stable enhancement and reentrant registration retain one listener", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  const filter = part(root, "filter");
  const add = filter.addEventListener.bind(filter);
  const called = vi.spyOn(filter, "addEventListener").mockImplementationOnce((...args) => {
    ui.enhance(root);
    add(...args);
  });
  ui.enhance(root);
  ui.enhance(root);
  ui.enhance(root);
  expect(called.mock.calls.filter(([name]) => name === "change")).toHaveLength(1);
});
it("Log cleanup reentry cannot remove replacement viewport listeners", () => {
  const { ui } = install();
  const root = fixture("log-viewer");
  ui.enhance(root);
  const filter = part(root, "filter");
  const view = part(root, "viewport");
  const oldRemove = filter.removeEventListener.bind(filter);
  const newFilter = part(fixture("log-viewer"), "filter");
  filter.replaceWith(newFilter);
  vi.spyOn(filter, "removeEventListener").mockImplementationOnce((...args) => {
    oldRemove(...args);
    ui.enhance(root);
  });
  ui.enhance(root);
  scrollSize(view);
  view.scrollTop = 0;
  view.dispatchEvent(new Event("scroll"));
  expect(ui.logViewer.state(root).following).toBe(false);
});
it("Log ignores a microtask acquired after disposal", () => {
  const { ui, star } = install();
  const root = fixture("log-viewer");
  document.body.append(root);
  const view = part(root, "viewport");
  scrollSize(view);
  const pending: VoidFunction[] = [];
  vi.spyOn(window, "queueMicrotask").mockImplementationOnce((callback) => {
    star.dispose();
    pending.push(callback);
  });
  ui.enhance(root);
  for (const callback of pending) callback();
  expect(view.scrollTop).toBe(0);
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name} fixture part.`);
  return value;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

function json(source = '{"first":1}'): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "json-viewer";
  root.innerHTML = `<script type="application/json" data-part="source">${source}</script><div data-part="tree"></div><p data-part="status"></p>`;
  return root;
}

function log(): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "log-viewer";
  root.innerHTML = `
    <select data-part="filter"><option>all</option><option>error</option></select>
    <button data-part="pause"></button>
    <div data-part="viewport"><ol data-part="entries"><li data-part="entry" data-level="info">Original</li></ol></div>
    <p data-part="status"></p>`;
  return root;
}

function scrollSize(view: HTMLElement, height = 1000): void {
  Object.defineProperties(view, {
    scrollHeight: { configurable: true, value: height },
    clientHeight: { configurable: true, value: 100 },
  });
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("JSON Viewer part ownership", () => {
  it("normalizes an unserializable top-level value to JSON null", async () => {
    const root = json();
    await enhance(root);
    $.star.ui.jsonViewer.set(root, undefined);
    expect(part(root, "source").textContent).toBe("null");
    expect($.star.ui.jsonViewer.value(root)).toBeNull();
    expect(root.dataset.state).toBe("ready");
  });
  it.each(["all", "source", "tree", "status"])(
    "uses current parts after replacing %s",
    async (name) => {
      const root = json();
      document.body.append(root);
      await enhance(root);
      const oldSource = part(root, "source");
      const oldTree = part(root, "tree");
      const oldStatus = part(root, "status");
      const replacement = json(name === "source" || name === "all" ? '{"next":2}' : '{"first":1}');
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else part(root, name).replaceWith(part(replacement, name));
      await enhance(root);
      const expected = name === "source" || name === "all" ? { next: 2 } : { first: 1 };
      expect($.star.ui.jsonViewer.value(root)).toEqual(expected);
      expect(part(root, "tree").textContent).toContain(Object.keys(expected)[0]);
      expect(part(root, "status").textContent).toBe("2 JSON values.");
      const detachedText = [oldSource, oldTree, oldStatus].map((node) => node.textContent);
      $.star.ui.jsonViewer.set(root, { current: [3] });
      expect(part(root, "source").textContent).toContain('"current"');
      expect(part(root, "tree").textContent).toContain("current");
      [oldSource, oldTree, oldStatus].forEach((node, index) => {
        if (!root.contains(node)) expect(node.textContent).toBe(detachedText[index]);
      });
    },
  );

  it.each(["", " \n ", "null"])("stabilizes unchanged source %j", async (source) => {
    // Keep this fixture detached so a failing cache cannot feed the document observer.
    const root = json(source);
    const update = vi.fn();
    root.addEventListener("jquery-star:json-viewer:update", update);
    await enhance(root);
    const rendered = part(root, "tree").firstElementChild;
    await enhance(root);
    await enhance(root);
    expect(update).toHaveBeenCalledTimes(1);
    expect(part(root, "tree").firstElementChild).toBe(rendered);
    expect($.star.ui.jsonViewer.value(root)).toBeNull();
  });

  it("renders an unchanged parse error into replacement tree and status", async () => {
    const root = json("invalid");
    document.body.append(root);
    await enhance(root);
    const replacement = json("invalid");
    part(root, "tree").replaceWith(part(replacement, "tree"));
    part(root, "status").replaceWith(part(replacement, "status"));
    await enhance(root);
    expect(root.dataset.state).toBe("error");
    expect(part(root, "error").getAttribute("role")).toBe("alert");
    expect(part(root, "status").textContent).toBe("JSON could not be parsed.");
  });
});

describe("Log Viewer part ownership", () => {
  it("keeps one live log region and suppresses duplicate follow notifications", async () => {
    const root = log();
    part(root, "entries").setAttribute("role", "log");
    document.body.append(root);
    await enhance(root);
    const view = part(root, "viewport");
    expect(part(root, "entries").hasAttribute("role")).toBe(false);
    expect(view.getAttribute("role")).toBe("log");
    const followed = vi.fn();
    root.addEventListener("jquery-star:log-viewer:follow", followed);
    $.star.ui.logViewer.follow(root, true);
    view.dispatchEvent(new Event("scroll"));
    expect(followed).not.toHaveBeenCalled();
    $.star.ui.logViewer.follow(root, false);
    $.star.ui.logViewer.follow(root, false);
    expect(followed).toHaveBeenCalledOnce();
  });
  it.each(["all", "entries", "viewport", "filter", "pause", "status"])(
    "uses current parts and preserves pause/follow state after replacing %s",
    async (name) => {
      const root = log();
      document.body.append(root);
      await enhance(root);
      $.star.ui.logViewer.pause(root);
      $.star.ui.logViewer.follow(root, false);
      const oldEntries = part(root, "entries");
      const oldFilter = part(root, "filter");
      const oldView = part(root, "viewport");
      const replacement = log();
      part(replacement, "entries").textContent = "";
      if (name === "all") root.replaceChildren(...replacement.childNodes);
      else part(root, name).replaceWith(part(replacement, name));
      await enhance(root);
      const oldText = oldEntries.textContent;
      $.star.ui.logViewer.append(root, { level: "error", message: "Current entry" });
      expect(part(root, "entries").textContent).toContain("Current entry");
      expect(part(root, "viewport").getAttribute("aria-live")).toBe("off");
      expect(part(root, "pause").getAttribute("aria-pressed")).toBe("true");
      expect(part(root, "status").textContent).toContain("Paused");
      expect($.star.ui.logViewer.state(root)).toMatchObject({ paused: true, following: false });
      if (!root.contains(oldEntries)) expect(oldEntries.textContent).toBe(oldText);
      const filter = part(root, "filter");
      if (!(filter instanceof HTMLSelectElement)) throw new Error("Missing native filter.");
      filter.value = "error";
      filter.dispatchEvent(new Event("change"));
      expect($.star.ui.logViewer.state(root).filter).toBe("error");
      const filtered = vi.fn();
      const followed = vi.fn();
      root.addEventListener("jquery-star:log-viewer:filter", filtered);
      root.addEventListener("jquery-star:log-viewer:follow", followed);
      if (!root.contains(oldFilter)) {
        if (!(oldFilter instanceof HTMLSelectElement)) throw new Error("Missing old filter.");
        oldFilter.value = "all";
        oldFilter.dispatchEvent(new Event("change"));
      }
      if (!root.contains(oldView)) oldView.dispatchEvent(new Event("scroll"));
      expect(filtered).not.toHaveBeenCalled();
      expect(followed).not.toHaveBeenCalled();
      expect($.star.ui.logViewer.state(root)).toMatchObject({ filter: "error", following: false });
    },
  );

  it("balances native listeners across unchanged and replacement enhancement", async () => {
    const root = log();
    const filter = part(root, "filter");
    const view = part(root, "viewport");
    const filterAdd = vi.spyOn(filter, "addEventListener");
    const filterRemove = vi.spyOn(filter, "removeEventListener");
    const viewAdd = vi.spyOn(view, "addEventListener");
    const viewRemove = vi.spyOn(view, "removeEventListener");
    await enhance(root);
    await enhance(root);
    await enhance(root);
    for (const [add, remove, name] of [
      [filterAdd, filterRemove, "change"],
      [viewAdd, viewRemove, "scroll"],
    ] as const) {
      expect(
        add.mock.calls.filter(([type]) => type === name).length -
          remove.mock.calls.filter(([type]) => type === name).length,
      ).toBe(1);
    }
    root.replaceChildren(...log().childNodes);
    await enhance(root);
    for (const [add, remove, name] of [
      [filterAdd, filterRemove, "change"],
      [viewAdd, viewRemove, "scroll"],
    ] as const) {
      const removed = remove.mock.calls.filter(([type]) => type === name);
      const added = add.mock.calls.filter(([type]) => type === name);
      expect(removed).toHaveLength(added.length);
      expect(removed.map(([, callback]) => callback)).toEqual(
        added.map(([, callback]) => callback),
      );
    }
  });

  it.each(["follow", "pause", "detach"])(
    "rechecks %s before a queued follow scroll",
    async (action) => {
      const root = log();
      const view = part(root, "viewport");
      scrollSize(view);
      document.body.append(root);
      $.star.ui.enhance(root);
      if (action === "follow") $.star.ui.logViewer.follow(root, false);
      if (action === "pause") $.star.ui.logViewer.pause(root);
      if (action === "detach") root.remove();
      await $.star.whenEnhanced();
      expect(view.scrollTop).toBe(0);
    },
  );

  it("follows the current viewport when parts change before the queued scroll", async () => {
    const root = log();
    const oldView = part(root, "viewport");
    scrollSize(oldView);
    document.body.append(root);
    $.star.ui.enhance(root);
    const next = part(log(), "viewport");
    scrollSize(next, 2000);
    oldView.replaceWith(next);
    await enhance(root);
    expect(oldView.scrollTop).toBe(0);
    expect(next.scrollTop).toBe(2000);
    next.scrollTop = 100;
    next.dispatchEvent(new Event("scroll"));
    expect($.star.ui.logViewer.state(root).following).toBe(false);
    next.scrollTop = 1900;
    next.dispatchEvent(new Event("scroll"));
    expect($.star.ui.logViewer.state(root).following).toBe(true);
  });
});

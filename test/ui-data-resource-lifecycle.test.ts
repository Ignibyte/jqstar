import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { withStarDOMRealm } from "../src/testing";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};

let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});

afterEach(() => {
  star.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function part<T extends Element>(root: Element, selector: string, kind: new () => T): T {
  const element = root.querySelector(selector);
  if (!(element instanceof kind)) throw new Error(`Missing data fixture: ${selector}`);
  return element;
}

function chart(owner = document) {
  const realm = owner.defaultView as Window & typeof globalThis;
  const root = owner.createElement("figure");
  root.dataset.jqs = "chart";
  root.innerHTML = `<svg data-part="plot"></svg><div data-part="legend"></div><p data-part="status"></p>
    <table data-part="data"><caption>Counts</caption><thead><tr><th>Label</th><th data-series="count">Count</th></tr></thead>
    <tbody><tr><th>Alpha</th><td>10</td></tr></tbody></table>`;
  owner.body.append(root);
  return {
    root,
    plot: part(root, "svg", realm.SVGSVGElement),
    cell: part(root, "td", realm.HTMLTableCellElement),
  };
}

function table(owner = document) {
  const realm = owner.defaultView as Window & typeof globalThis;
  const root = owner.createElement("div");
  root.dataset.jqs = "data-table";
  root.dataset.pageSize = "1";
  root.innerHTML = `<input data-part="filter"><table data-part="table"><caption>Rows</caption>
    <thead><tr><th><input type="checkbox" data-part="select-all"></th><th data-key="name"><button data-part="sort">Name</button></th></tr></thead>
    <tbody><tr data-row-id="beta"><td><input type="checkbox" data-part="row-select"></td><th data-key="name">Beta</th></tr>
    <tr data-row-id="alpha"><td><input type="checkbox" data-part="row-select"></td><th data-key="name">Alpha</th></tr></tbody></table>
    <button data-part="previous">Previous</button><button data-part="next">Next</button><span data-part="page-status"></span><span data-part="selection-status"></span>`;
  owner.body.append(root);
  return {
    root,
    native: part(root, "table", realm.HTMLTableElement),
    sort: part(root, '[data-part="sort"]', HTMLButtonElement),
    filter: part(root, '[data-part="filter"]', HTMLInputElement),
    next: part(root, '[data-part="next"]', HTMLButtonElement),
    selected: part(root, '[data-row-id="beta"] input', HTMLInputElement),
  };
}

async function boundary(root: HTMLElement, mode: "render" | "native" | "dispose" | "preserve") {
  if (mode === "dispose") star.dispose();
  else if (mode === "native") {
    root.remove();
    await star.whenEnhanced();
  } else {
    const operation = createRenderAdapter(installed).begin(
      document.body,
      mode === "preserve" ? { preserveRoots: [root] } : {},
    );
    operation.beforeRemove(root);
    ui.enhance(document);
    return async () => {
      if (mode === "render") root.remove();
      await operation.commit();
    };
  }
  return undefined;
}

it.each(["render", "native", "dispose", "preserve"] as const)(
  "Data Table releases captured bindings across %s",
  async (mode) => {
    const { root, native, sort, filter, next, selected } = table();
    ui.enhance(root);
    await star.whenEnhanced();
    const removedSort = vi.spyOn(sort, "removeEventListener");
    const removedFilter = vi.spyOn(filter, "removeEventListener");
    const removedNext = vi.spyOn(next, "removeEventListener");
    const removedRoot = vi.spyOn(root, "removeEventListener");
    const events = vi.fn();
    for (const name of ["sort", "filter", "page", "selection-change"])
      root.addEventListener(`jquery-star:data-table:${name}`, events);
    const finish = await boundary(root, mode);
    const before = root.outerHTML;
    const rows = [...native.rows];
    sort.click();
    next.click();
    filter.value = "Alpha";
    filter.dispatchEvent(new Event("input", { bubbles: true }));
    selected.checked = true;
    selected.dispatchEvent(new Event("change", { bubbles: true }));
    if (mode === "preserve") expect(events).toHaveBeenCalledTimes(4);
    else {
      expect(events).not.toHaveBeenCalled();
      expect(root.outerHTML).toBe(before);
      expect([...native.rows]).toEqual(rows);
      expect(removedSort).toHaveBeenCalledWith("click", expect.any(Function));
      expect(removedFilter).toHaveBeenCalledWith("input", expect.any(Function));
      expect(removedNext).toHaveBeenCalledWith("click", expect.any(Function));
      expect(removedRoot).toHaveBeenCalledWith("change", expect.any(Function));
    }
    await finish?.();
  },
);

it("Data Table reacquires one current listener set", async () => {
  const { root, sort } = table();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const sorted = vi.fn();
  root.addEventListener("jquery-star:data-table:sort", sorted);
  sort.click();
  expect(sorted).toHaveBeenCalledOnce();
  expect(ui.dataTable.sorts(root)).toEqual([{ key: "name", direction: "ascending" }]);
});

it.each([false, true])("Data Table stops before-sort disposal with cancellation %s", (cancel) => {
  const { root, native } = table();
  ui.enhance(root);
  const before = [...native.rows];
  const sorted = vi.fn();
  root.addEventListener("jquery-star:data-table:sort", sorted);
  root.addEventListener("jquery-star:data-table:before-sort", (event) => {
    if (cancel) event.preventDefault();
    star.dispose();
    root.dataset.sort = "retired";
  });
  ui.dataTable.sort(root, "name", "ascending");
  expect(root.dataset.sort).toBe("retired");
  expect([...native.rows]).toEqual(before);
  expect(sorted).not.toHaveBeenCalled();
});

it.each([false, true])("Data Table keeps a nested sort with outer cancellation %s", (cancel) => {
  const { root } = table();
  ui.enhance(root);
  const sorted = vi.fn();
  root.addEventListener("jquery-star:data-table:sort", sorted);
  root.addEventListener(
    "jquery-star:data-table:before-sort",
    (event) => {
      ui.dataTable.sort(root, "name", "ascending");
      if (cancel) event.preventDefault();
    },
    { once: true },
  );
  ui.dataTable.sort(root, "name", "descending");
  expect(ui.dataTable.sorts(root)).toEqual([{ key: "name", direction: "ascending" }]);
  expect(sorted).toHaveBeenCalledOnce();
  expect((sorted.mock.calls[0]?.[0] as CustomEvent).detail.direction).toBe("ascending");
});

it("Data Table stops old sort continuation after table replacement", () => {
  const { root, native } = table();
  ui.enhance(root);
  const sorted = vi.fn();
  root.addEventListener("jquery-star:data-table:sort", sorted);
  root.addEventListener(
    "jquery-star:data-table:before-sort",
    () => {
      native.replaceWith(native.cloneNode(true));
      root.dataset.direction = "ascending";
      root.dataset.sorts = '[{"key":"name","direction":"ascending"}]';
      ui.enhance(root);
    },
    { once: true },
  );
  ui.dataTable.sort(root, "name", "descending");
  expect(sorted).not.toHaveBeenCalled();
  expect(ui.dataTable.sorts(root)).toEqual([{ key: "name", direction: "ascending" }]);
});

it("Data Table replaces sort/filter/pager bindings without stale events", () => {
  const { root, sort, filter, next } = table();
  ui.enhance(root);
  for (const control of [sort, filter, next]) control.replaceWith(control.cloneNode(true));
  ui.enhance(root);
  ui.enhance(root);
  const events = vi.fn();
  for (const name of ["sort", "filter", "page"])
    root.addEventListener(`jquery-star:data-table:${name}`, events);
  sort.click();
  filter.dispatchEvent(new Event("input"));
  next.click();
  expect(events).not.toHaveBeenCalled();
  part(root, '[data-part="sort"]', HTMLButtonElement).click();
  expect(events).toHaveBeenCalledOnce();
});

it.each(["native", "reinstall"] as const)(
  "Data Table retains off-page selection and seed history after %s",
  async (mode) => {
    const { root, native, selected } = table();
    root.dataset.processing = "manual";
    selected.checked = true;
    ui.enhance(root);
    const body = native.tBodies[0];
    if (!body) throw new Error("Missing table body.");
    body.innerHTML =
      '<tr data-row-id="gamma"><td><input type="checkbox" data-part="row-select"></td><th data-key="name">Gamma</th></tr>';
    ui.enhance(root);
    expect(ui.dataTable.selected(root)).toEqual(["beta"]);
    await star.whenEnhanced();
    if (mode === "native") {
      root.remove();
      await star.whenEnhanced();
    } else star.dispose();
    body.innerHTML =
      '<tr data-row-id="delta"><td><input type="checkbox" data-part="row-select" checked></td><th data-key="name">Delta</th></tr>';
    if (mode === "native") document.body.append(root);
    else {
      installed = installStarCore($, { document });
      star = installed.star;
      ui = star.use(uiPlugin);
    }
    ui.enhance(root);
    expect(ui.dataTable.selected(root)).toEqual(["beta"]);
    expect(part(body, "input", HTMLInputElement).checked).toBe(false);
  },
);

it.each(["first", "refresh"] as const)(
  "Chart stops %s rendering after before-render disposal",
  (mode) => {
    const { root, plot, cell } = chart();
    if (mode === "refresh") ui.enhance(root);
    cell.textContent = "20";
    const before = plot.innerHTML;
    const rendered = vi.fn();
    root.addEventListener("jquery-star:chart:render", rendered);
    root.addEventListener("jquery-star:chart:before-render", () => star.dispose());
    if (mode === "first") ui.enhance(root);
    else ui.chart.refresh(root);
    expect(plot.innerHTML).toBe(before);
    expect(rendered).not.toHaveBeenCalled();
  },
);

it("Chart stops a render retired by a connected before-remove barrier", async () => {
  const { root, plot, cell } = chart();
  ui.enhance(root);
  await star.whenEnhanced();
  const before = plot.innerHTML;
  cell.textContent = "20";
  const operation = createRenderAdapter(installed).begin(document.body);
  const rendered = vi.fn();
  root.addEventListener("jquery-star:chart:render", rendered);
  root.addEventListener("jquery-star:chart:before-render", () => operation.beforeRemove(root), {
    once: true,
  });
  ui.chart.refresh(root);
  ui.enhance(document);
  expect(plot.innerHTML).toBe(before);
  expect(rendered).not.toHaveBeenCalled();
  root.remove();
  await operation.commit();
});

it("Chart invalidates its render signature after native cleanup", async () => {
  const { root, plot } = chart();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  plot.replaceChildren();
  document.body.append(root);
  ui.enhance(root);
  expect(plot.querySelectorAll('[data-part="bar"]')).toHaveLength(1);
});

it.each(["preserve", "move"] as const)(
  "Chart preserves an unchanged plot through %s",
  async (mode) => {
    const { root, plot } = chart();
    ui.enhance(root);
    await star.whenEnhanced();
    const content = plot.firstChild;
    if (mode === "preserve") {
      const finish = await boundary(root, "preserve");
      await finish?.();
    } else {
      const wrapper = document.createElement("div");
      document.body.append(wrapper);
      wrapper.append(root);
      ui.enhance(root);
      await star.whenEnhanced();
    }
    expect(plot.firstChild).toBe(content);
  },
);

it.each(["data", "plot", "type", "canceled"] as const)(
  "Chart keeps a newer %s render from before-render",
  (mode) => {
    const { root, plot, cell } = chart();
    ui.enhance(root);
    cell.textContent = "20";
    const rendered = vi.fn();
    root.addEventListener("jquery-star:chart:render", rendered);
    root.addEventListener(
      "jquery-star:chart:before-render",
      (outer) => {
        if (mode === "plot") plot.replaceWith(plot.cloneNode(false));
        if (mode === "canceled") outer.preventDefault();
        cell.textContent = "30";
        if (mode === "type") ui.chart.setType(root, "line");
        else ui.chart.refresh(root);
      },
      { once: true },
    );
    ui.chart.refresh(root);
    const current = part(root, "svg", SVGSVGElement);
    expect(
      current.querySelector('[data-part="bar"] title, [data-part="point"] title')?.textContent,
    ).toBe("Alpha, Count: 30");
    expect(rendered).toHaveBeenCalledOnce();
    expect(ui.chart.type(root)).toBe(mode === "type" ? "line" : "bar");
  },
);

it.each(["dispose", "throw"] as const)(
  "Data Table rolls back listeners when acquisition encounters %s",
  (mode) => {
    const { root, sort, filter } = table();
    const native = sort.addEventListener.bind(sort);
    const removed = vi.spyOn(sort, "removeEventListener");
    const addedFilter = vi.spyOn(filter, "addEventListener");
    vi.spyOn(sort, "addEventListener").mockImplementationOnce((type, callback, options) => {
      native(type, callback, options);
      if (mode === "dispose") star.dispose();
      else throw new Error("listener setup failed");
    });
    if (mode === "throw") expect(() => ui.enhance(root)).toThrow("listener setup failed");
    else ui.enhance(root);
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    expect(addedFilter).not.toHaveBeenCalled();
  },
);

for (const kind of ["chart", "dataTable"] as const) {
  it(`${kind} disposal leaves the other document's controller current`, async () => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const fixtures: Array<ReturnType<typeof chart> | ReturnType<typeof table>> = [];
    const apis: Array<ReturnType<typeof uiPlugin.install>> = [];
    const realms: Array<{ window: Window & typeof globalThis; jQuery: JQueryStatic }> = [];
    try {
      for (const frame of frames) {
        const window = frame.contentWindow as Window & typeof globalThis;
        const realm = { window, jQuery: jQueryFactory(window) };
        realms.push(realm);
        await withStarDOMRealm(realm, () => {
          const owner = installStarCore(realm.jQuery, { document: window.document }).star;
          owners.push(owner);
          const localUI = owner.use(uiPlugin);
          apis.push(localUI);
          const fixture = kind === "chart" ? chart(window.document) : table(window.document);
          fixtures.push(fixture);
          localUI.enhance(fixture.root);
        });
      }
      owners[0]?.dispose();
      for (const [index, fixture] of fixtures.entries()) {
        const realm = realms[index];
        const localUI = apis[index];
        if (!realm || !localUI) throw new Error("Missing data realm.");
        await withStarDOMRealm(realm, () => {
          if (index === 0) {
            expect(() => localUI.enhance(fixture.root)).toThrow("disposed");
          } else if ("plot" in fixture) {
            fixture.cell.textContent = "25";
            localUI.chart.refresh(fixture.root);
            expect(fixture.plot.querySelector('[data-part="bar"] title')?.textContent).toBe(
              "Alpha, Count: 25",
            );
          } else {
            fixture.sort.click();
            expect(localUI.dataTable.sorts(fixture.root)).toEqual([
              { key: "name", direction: "ascending" },
            ]);
          }
        });
      }
    } finally {
      for (const owner of owners) owner.dispose();
      for (const frame of frames) frame.remove();
    }
  });
}

it("Data Table attempts every captured removal and preserves setup/cleanup failures", () => {
  const { root, sort, filter } = table();
  const setupError = new Error("setup failed");
  const cleanupError = new Error("cleanup failed");
  const remove = sort.removeEventListener.bind(sort);
  const add = filter.addEventListener.bind(filter);
  const removedFilter = vi.spyOn(filter, "removeEventListener");
  vi.spyOn(sort, "removeEventListener").mockImplementationOnce((type, listener, options) => {
    remove(type, listener, options);
    throw cleanupError;
  });
  vi.spyOn(filter, "addEventListener").mockImplementationOnce((type, listener, options) => {
    add(type, listener, options);
    throw setupError;
  });
  let failure: unknown;
  try {
    ui.enhance(root);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw new Error("Missing setup failure.");
  expect(failure.errors[0]).toBe(setupError);
  expect(failure.errors[1]).toBeInstanceOf(AggregateError);
  expect(removedFilter).toHaveBeenCalledWith("input", expect.any(Function));
});

it("Data Table keeps its original row order through cleanup and reacquisition", async () => {
  const { root, native } = table();
  ui.enhance(root);
  ui.dataTable.sort(root, "name", "ascending");
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  ui.dataTable.sort(root, "name", "none");
  expect([...(native.tBodies[0]?.rows ?? [])].map((row) => row.dataset.rowId)).toEqual([
    "beta",
    "alpha",
  ]);
});

it("Data Table retains a filter without a native input across reacquisition", async () => {
  const { root, native, filter } = table();
  root.dataset.pageSize = "5";
  ui.enhance(root);
  ui.dataTable.filter(root, "Beta");
  filter.remove();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  expect(
    [...(native.tBodies[0]?.rows ?? [])]
      .filter((row) => !row.hidden)
      .map((row) => row.dataset.rowId),
  ).toEqual(["beta"]);
});

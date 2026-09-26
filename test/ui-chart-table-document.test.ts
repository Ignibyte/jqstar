import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
type Kind = "chart" | "data-table";
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing Chart/Data Table fixture part");
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
function fixture(kind: Kind, owner: Window = window): HTMLElement {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "report";
  root.className = "report-target";
  root.dataset.pageSize = "1";
  root.innerHTML =
    kind === "chart"
      ? '<svg data-part="plot"></svg><div data-part="legend"></div><p data-part="status"></p><table data-part="data"><caption>Counts</caption><thead><tr><th>Label</th><th data-series="count">Count</th></tr></thead><tbody><tr><th>Alpha</th><td>10</td></tr></tbody></table>'
      : '<input data-part="filter"><table data-part="table"><caption>Rows</caption><thead><tr><th><input type="checkbox" data-part="select-all"></th><th data-key="name"><button data-part="sort">Name</button></th></tr></thead><tbody><tr data-row-id="beta"><td><input type="checkbox" data-part="row-select"></td><th data-key="name">Beta</th></tr><tr data-row-id="alpha"><td><input type="checkbox" data-part="row-select"></td><th data-key="name">Alpha</th></tr></tbody></table><button data-part="previous">Previous</button><button data-part="next">Next</button><p data-part="page-status"></p><p data-part="selection-status"></p>';
  return root;
}
function part(root: Element, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function ids(table: HTMLTableElement): Array<string | undefined> {
  return Array.from(required(table.tBodies[0]).rows, (row) => row.dataset.rowId);
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

describe.each(["chart", "data-table"] as const)("%s document ownership", (kind) => {
  it("accepts the foreign facade and uses owning-window events", () => {
    const { ui, owner } = install(realm());
    const root = fixture(kind, owner);
    const events: Event[] = [];
    root.addEventListener(`jquery-star:${kind}:${kind === "chart" ? "render" : "sort"}`, (event) =>
      events.push(event),
    );
    if (kind === "chart") expect(ui.chart.data(root).labels).toEqual(["Alpha"]);
    else ui.dataTable.sort(root, "name", "ascending");
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
  });
  it("automatically enhances a foreign document", async () => {
    const { owner, star } = install(realm());
    await star.whenEnhanced();
    const root = fixture(kind, owner);
    owner.document.body.append(root);
    await star.whenEnhanced();
    if (kind === "chart") expect(part(root, "plot").children.length).toBeGreaterThan(0);
    else expect(root.dataset.rowCount).toBe("2");
  });
  it.each(["implicit", "selector", "class", "element"] as const)(
    "accepts a foreign %s action with the root as application",
    async (mode) => {
      const { owner, jquery } = install(realm());
      const root = fixture(kind, owner);
      const app = required(jquery(root).star().star("instance"));
      const target = mode === "element" ? root : mode === "class" ? ".report-target" : "#report";
      const value = kind === "chart" ? ["line"] : ["name", "ascending"];
      await app.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
        args: mode === "implicit" ? value : [target, ...value],
      });
      expect(root.dataset[kind === "chart" ? "type" : "direction"]).toBe(
        kind === "chart" ? "line" : "ascending",
      );
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains native identity and state on adoption through %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      const checkbox =
        kind === "data-table" ? (part(root, "row-select") as HTMLInputElement) : undefined;
      if (checkbox) checkbox.checked = true;
      source.ui.enhance(root);
      const native = part(root, kind === "chart" ? "plot" : "table");
      const child = native.firstElementChild;
      destination.owner.document.adoptNode(root);
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") {
        if (kind === "chart") destination.ui.chart.data(root);
        else destination.ui.dataTable.selected(root);
      } else destination.ui.enhance(root);
      source.star.dispose();
      expect(part(root, kind === "chart" ? "plot" : "table")).toBe(native);
      expect(native.firstElementChild).toBe(child);
      const events: Event[] = [];
      root.addEventListener(
        `jquery-star:${kind}:${kind === "chart" ? "render" : "sort"}`,
        (event) => events.push(event),
      );
      if (kind === "chart") destination.ui.chart.setType(root, "line");
      else {
        expect(destination.ui.dataTable.selected(root)).toEqual(["beta"]);
        part(root, "sort").click();
        expect(ids(native as unknown as HTMLTableElement)).toEqual(["alpha", "beta"]);
      }
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(
        (destination.owner as Window & typeof globalThis).CustomEvent,
      );
    },
  );
});

describe("Chart current output", () => {
  it("ignores plot slots under a different controller", () => {
    const { ui } = install();
    const root = fixture("chart");
    const nested = document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<svg data-part="plot"></svg>';
    root.prepend(nested);
    ui.enhance(root);
    expect(part(nested, "plot").childNodes).toHaveLength(0);
    expect(root.querySelector(':scope > svg [data-part="bar"]')).not.toBeNull();
  });
  it.each(["plot", "legend", "status", "data"])(
    "stops old writes after before-render replaces %s without enhancement",
    (name) => {
      const { ui } = install();
      const root = fixture("chart");
      ui.enhance(root);
      const plot = part(root, "plot");
      const before = plot.innerHTML;
      required(root.querySelector("td")).textContent = "20";
      root.addEventListener(
        "jquery-star:chart:before-render",
        () => {
          const target = part(root, name);
          target.replaceWith(target.cloneNode(true));
        },
        { once: true },
      );
      const rendered = vi.fn();
      root.addEventListener("jquery-star:chart:render", rendered);
      ui.chart.refresh(root);
      expect(plot.innerHTML).toBe(before);
      expect(rendered).not.toHaveBeenCalled();
      ui.enhance(root);
      expect(part(root, "bar").querySelector("title")?.textContent).toBe("Alpha, Count: 20");
    },
  );
  it.each(["data", "type"])("stops an older render after a callback patches %s", (kind) => {
    const { ui } = install();
    const root = fixture("chart");
    ui.enhance(root);
    const before = part(root, "plot").innerHTML;
    root.addEventListener(
      "jquery-star:chart:before-render",
      () => {
        if (kind === "data") required(root.querySelector("td")).textContent = "30";
        else root.dataset.type = "line";
      },
      { once: true },
    );
    const rendered = vi.fn();
    root.addEventListener("jquery-star:chart:render", rendered);
    ui.chart.refresh(root);
    expect(part(root, "plot").innerHTML).toBe(before);
    expect(rendered).not.toHaveBeenCalled();
    ui.enhance(root);
    expect(rendered).toHaveBeenCalledOnce();
    expect(part(root, kind === "data" ? "bar" : "point").querySelector("title")?.textContent).toBe(
      `Alpha, Count: ${kind === "data" ? "30" : "10"}`,
    );
  });
  it("stops later output when a plot write disposes the owner", () => {
    const { ui, star } = install();
    const root = fixture("chart");
    ui.enhance(root);
    const plot = part(root, "plot");
    const native = plot.replaceChildren.bind(plot);
    const legend = part(root, "legend").firstChild;
    const rendered = vi.fn();
    root.addEventListener("jquery-star:chart:render", rendered);
    vi.spyOn(plot, "replaceChildren").mockImplementationOnce((...nodes) => {
      native(...nodes);
      star.dispose();
    });
    ui.chart.refresh(root);
    expect(part(root, "legend").firstChild).toBe(legend);
    expect(rendered).not.toHaveBeenCalled();
  });
  it("retries a throwing plot write without caching interrupted output", () => {
    const { ui } = install();
    const root = fixture("chart");
    ui.enhance(root);
    required(root.querySelector("td")).textContent = "20";
    vi.spyOn(part(root, "plot"), "replaceChildren").mockImplementationOnce(() => {
      throw new Error("plot write failed");
    });
    expect(() => ui.chart.refresh(root)).toThrow("plot write failed");
    ui.enhance(root);
    expect(part(root, "bar").querySelector("title")?.textContent).toBe("Alpha, Count: 20");
  });
  it("does not recurse when before-render reads data and type", () => {
    const { ui } = install();
    const root = fixture("chart");
    let reading = false;
    const values: unknown[] = [];
    const before = vi.fn(() => {
      if (reading) return;
      reading = true;
      values.push(ui.chart.data(root).labels, ui.chart.type(root));
    });
    root.addEventListener("jquery-star:chart:before-render", before);
    ui.enhance(root);
    expect(before).toHaveBeenCalledOnce();
    expect(values).toEqual([["Alpha"], "bar"]);
    expect(part(root, "plot").children).toHaveLength(1);
  });
  it("keeps a newer no-op type request during initial rendering", () => {
    const { ui } = install();
    const root = fixture("chart");
    root.addEventListener("jquery-star:chart:before-render", () => ui.chart.setType(root, "line"), {
      once: true,
    });
    ui.chart.setType(root, "bar");
    expect(ui.chart.type(root)).toBe("line");
    expect(root.dataset.type).toBe("line");
    expect(root.querySelector('[data-part="bar"]')).toBeNull();
    expect(root.querySelector('[data-part="line"]')).not.toBeNull();
  });
  it("returns defensive data and isolates mutable event data", () => {
    const { ui } = install();
    const root = fixture("chart");
    root.addEventListener("jquery-star:chart:before-render", (event) => {
      const detail = (event as CustomEvent<{ data: { labels: string[] } }>).detail;
      detail.data.labels[0] = "Changed";
    });
    const data = ui.chart.data(root);
    data.labels[0] = "Changed";
    required(data.series[0]).values[0] = 100;
    expect(ui.chart.data(root).labels).toEqual(["Alpha"]);
    expect(part(root, "bar").querySelector("title")?.textContent).toBe("Alpha, Count: 10");
  });
});

describe("Data Table current controls", () => {
  it("ignores selection under a different controller", () => {
    const { ui } = install();
    const root = fixture("data-table");
    const nested = document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<input type="checkbox" data-part="select-all">';
    root.append(nested);
    ui.enhance(root);
    const input = part(nested, "select-all") as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(ui.dataTable.selected(root)).toEqual([]);
  });
  it("facade sorting refreshes the current replacement table", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const old = part(root, "table") as HTMLTableElement;
    const next = old.cloneNode(true) as HTMLTableElement;
    old.replaceWith(next);
    ui.dataTable.sort(root, "name", "ascending");
    expect(ids(next)).toEqual(["alpha", "beta"]);
    expect(ids(old)).toEqual(["beta", "alpha"]);
  });
  it.each(["page", "filter"])("newer %s supersedes older sort continuation", (kind) => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    root.addEventListener(
      "jquery-star:data-table:before-sort",
      () => {
        if (kind === "page") ui.dataTable.page(root, 2);
        else ui.dataTable.filter(root, "Alpha");
      },
      { once: true },
    );
    ui.dataTable.sort(root, "name", "ascending");
    expect(sorted).not.toHaveBeenCalled();
    expect(root.dataset.page).toBe(kind === "page" ? "2" : "1");
    if (kind === "filter") expect(root.dataset.rowCount).toBe("1");
  });
  it.each(["sort", "filter", "next", "row-select"])(
    "honors canceled native %s activation",
    (name) => {
      const { ui } = install();
      const root = fixture("data-table");
      const control = part(root, name);
      const type = name === "filter" ? "input" : name === "row-select" ? "change" : "click";
      control.addEventListener(type, (event) => event.preventDefault());
      ui.enhance(root);
      const before = root.outerHTML;
      const events = vi.fn();
      for (const event of ["sort", "filter", "page", "selection-change"])
        root.addEventListener(`jquery-star:data-table:${event}`, events);
      if (name === "filter") (control as HTMLInputElement).value = "Alpha";
      if (name === "row-select") (control as HTMLInputElement).checked = true;
      control.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      expect(events).not.toHaveBeenCalled();
      expect(root.outerHTML).toBe(before);
    },
  );
  it.each(["data-disabled", "aria-disabled", "inert"])(
    "ignores %s native filters and constrained ancestors",
    (attribute) => {
      const { ui } = install();
      const root = fixture("data-table");
      ui.enhance(root);
      const filter = part(root, "filter") as HTMLInputElement;
      const filtered = vi.fn();
      root.addEventListener("jquery-star:data-table:filter", filtered);
      for (const target of [filter, root]) {
        target.setAttribute(attribute, attribute === "inert" ? "" : "true");
        filter.value = "Alpha";
        filter.dispatchEvent(new Event("input", { bubbles: true }));
        expect(filtered).not.toHaveBeenCalled();
        expect(root.dataset.rowCount).toBe("2");
        target.removeAttribute(attribute);
      }
    },
  );
  it("unchanged enhancement retains native bindings", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const remove = vi.spyOn(part(root, "sort"), "removeEventListener");
    ui.enhance(root);
    expect(remove).not.toHaveBeenCalled();
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    part(root, "sort").click();
    expect(sorted).toHaveBeenCalledOnce();
  });
  it("cleanup reentry keeps one effective native binding set", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const sort = part(root, "sort");
    const remove = sort.removeEventListener.bind(sort);
    vi.spyOn(sort, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      ui.enhance(root);
    });
    // Replacing another control requires retirement even when unchanged enhancement is stable.
    const filter = part(root, "filter");
    filter.replaceWith(filter.cloneNode(true));
    ui.enhance(root);
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    sort.click();
    expect(sorted).toHaveBeenCalledOnce();
    expect(ui.dataTable.sorts(root)).toEqual([{ key: "name", direction: "ascending" }]);
  });
  it.each(["before", "after"])(
    "releases a native listener installed %s disposal during acquisition",
    (order) => {
      const { ui, star } = install();
      const root = fixture("data-table");
      const sort = part(root, "sort");
      const add = sort.addEventListener.bind(sort);
      const removed = vi.spyOn(sort, "removeEventListener");
      vi.spyOn(sort, "addEventListener").mockImplementationOnce((...args) => {
        if (order === "before") add(...args);
        star.dispose();
        if (order === "after") add(...args);
      });
      ui.enhance(root);
      const sorted = vi.fn();
      root.addEventListener("jquery-star:data-table:sort", sorted);
      part(root, "sort").click();
      expect(sorted).not.toHaveBeenCalled();
      expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    },
  );
});

describe.each(["chart", "data-table"] as const)("%s action constraints", (kind) => {
  it("stops a named action when its callback constrains the root", async () => {
    const { ui, jquery } = install();
    const root = fixture(kind);
    const app = required(jquery(root).star().star("instance"));
    ui.enhance(root);
    const before = kind === "chart" ? "before-render" : "before-sort";
    root.addEventListener(
      `jquery-star:${kind}:${before}`,
      () => {
        root.dataset.disabled = "true";
      },
      { once: true },
    );
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:${kind === "chart" ? "render" : "sort"}`, changed);
    await app.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
      args: kind === "chart" ? ["line"] : ["name", "ascending"],
    });
    expect(changed).not.toHaveBeenCalled();
  });
  it("rejects an explicit action target owned by another document", async () => {
    const source = install();
    const destination = install(realm());
    const app = required(source.jquery(fixture(kind)).star().star("instance"));
    const root = fixture(kind, destination.owner);
    destination.ui.enhance(root);
    await expect(
      app.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
        args: kind === "chart" ? [root, "line"] : [root, "name", "ascending"],
      }),
    ).rejects.toThrow("Document");
  });
  it("rejects a source installation's action after its application is adopted", async () => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    const app = required(source.jquery(root).star().star("instance"));
    source.ui.enhance(root);
    destination.owner.document.adoptNode(root);
    destination.ui.enhance(root);
    await expect(
      app.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
        args: kind === "chart" ? [root, "line"] : [root, "name", "ascending"],
      }),
    ).rejects.toThrow("Document");
  });
  it.each(["disabled", "aria-disabled", "data-disabled", "inert"])(
    "respects %s on an action ancestor while the facade remains available",
    async (attribute) => {
      const { ui, jquery } = install();
      const root = fixture(kind);
      const wrapper = document.createElement("div");
      wrapper.append(root);
      const app = required(jquery(root).star().star("instance"));
      ui.enhance(root);
      const events = vi.fn();
      root.addEventListener(`jquery-star:${kind}:${kind === "chart" ? "render" : "sort"}`, events);
      wrapper.setAttribute(attribute, ["disabled", "inert"].includes(attribute) ? "" : "true");
      await app.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
        args: kind === "chart" ? ["line"] : ["name", "ascending"],
      });
      expect(events).not.toHaveBeenCalled();
      if (kind === "chart") ui.chart.setType(root, "line");
      else ui.dataTable.sort(root, "name", "ascending");
      expect(events).toHaveBeenCalledOnce();
    },
  );
});

describe("Chart render recovery", () => {
  it("completes a newer unchanged type request during before-render", () => {
    const { ui } = install();
    const root = fixture("chart");
    root.addEventListener("jquery-star:chart:before-render", () => ui.chart.setType(root, "bar"), {
      once: true,
    });
    ui.enhance(root);
    expect(root.querySelector('[data-part="bar"]')).not.toBeNull();
  });
  it.each(["legend", "status"])("stops an older %s write after a newer type request", (name) => {
    const { ui } = install();
    const root = fixture("chart");
    ui.enhance(root);
    const element = part(root, name);
    if (name === "legend") {
      const replace = element.replaceChildren.bind(element);
      vi.spyOn(element, "replaceChildren").mockImplementationOnce((...nodes) => {
        replace(...nodes);
        ui.chart.setType(root, "line");
      });
    } else {
      required(root.querySelector("td")).textContent = "20";
      const descriptor = required(Object.getOwnPropertyDescriptor(Node.prototype, "textContent"));
      let once = true;
      Object.defineProperty(element, "textContent", {
        configurable: true,
        get() {
          return descriptor.get?.call(element);
        },
        set(value: string) {
          descriptor.set?.call(element, value);
          if (once) {
            once = false;
            ui.chart.setType(root, "line");
          }
        },
      });
      // Change the status text so its setter is necessarily exercised.
      descriptor.set?.call(element, "Pending");
    }
    const rendered = vi.fn();
    root.addEventListener("jquery-star:chart:render", rendered);
    ui.chart.refresh(root);
    expect(ui.chart.type(root)).toBe("line");
    expect(rendered).toHaveBeenCalledOnce();
    expect(part(root, "status").textContent).toContain("line chart");
  });
});

describe("Data Table render ordering", () => {
  it("does not retain partially seeded selection after invalid initial rows", () => {
    const { ui } = install();
    const root = fixture("data-table");
    const checkbox = part(root, "row-select") as HTMLInputElement;
    checkbox.checked = true;
    const row = required(root.querySelector<HTMLElement>('[data-row-id="alpha"]'));
    row.dataset.rowId = "beta";
    expect(() => ui.enhance(root)).toThrow("duplicate row id");
    checkbox.checked = false;
    row.dataset.rowId = "alpha";
    ui.enhance(root);
    expect(ui.dataTable.selected(root)).toEqual([]);
  });
  it.each(["page", "filter", "rows", "processing"])(
    "stops an older sort after before-sort patches %s without enhancement",
    (kind) => {
      const { ui } = install();
      const root = fixture("data-table");
      ui.enhance(root);
      const sorted = vi.fn();
      root.addEventListener("jquery-star:data-table:sort", sorted);
      root.addEventListener(
        "jquery-star:data-table:before-sort",
        () => {
          if (kind === "page") root.dataset.page = "2";
          if (kind === "filter") (part(root, "filter") as HTMLInputElement).value = "Alpha";
          if (kind === "rows") required(root.querySelector("tbody th")).textContent = "Gamma";
          if (kind === "processing") root.dataset.processing = "manual";
        },
        { once: true },
      );
      ui.dataTable.sort(root, "name", "ascending");
      expect(sorted).not.toHaveBeenCalled();
      if (kind === "page") expect(root.dataset.page).toBe("2");
      ui.enhance(root);
      if (kind === "filter") expect(root.dataset.rowCount).toBe("1");
    },
  );
  it("preserves authored disabled selection and pager controls", () => {
    const { ui } = install();
    const root = fixture("data-table");
    const selection = part(root, "select-all") as HTMLInputElement;
    const next = part(root, "next") as HTMLButtonElement;
    selection.disabled = true;
    next.disabled = true;
    ui.enhance(root);
    expect(selection.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    selection.checked = true;
    selection.dispatchEvent(new Event("change", { bubbles: true }));
    expect(ui.dataTable.selected(root)).toEqual([]);
  });
  it("stops a native sort when before-sort disables its trigger", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const sort = part(root, "sort") as HTMLButtonElement;
    root.addEventListener(
      "jquery-star:data-table:before-sort",
      () => {
        sort.disabled = true;
      },
      { once: true },
    );
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    sort.click();
    expect(sorted).not.toHaveBeenCalled();
    expect(ids(part(root, "table") as HTMLTableElement)).toEqual(["beta", "alpha"]);
    expect(ui.dataTable.sorts(root)).toEqual([]);
  });
  it("does not commit proposed row order when a before-sort facade read precedes cancellation", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    let proposed: unknown;
    root.addEventListener("jquery-star:data-table:before-sort", (event) => {
      proposed = ui.dataTable.sorts(root);
      event.preventDefault();
    });
    ui.dataTable.sort(root, "name", "ascending");
    expect(proposed).toEqual([{ key: "name", direction: "ascending" }]);
    expect(ids(part(root, "table") as HTMLTableElement)).toEqual(["beta", "alpha"]);
    expect(ui.dataTable.sorts(root)).toEqual([]);
  });
  it("stops sorting when before-sort replaces the table without enhancement", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const table = part(root, "table") as HTMLTableElement;
    root.addEventListener(
      "jquery-star:data-table:before-sort",
      () => table.replaceWith(table.cloneNode(true)),
      { once: true },
    );
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    ui.dataTable.sort(root, "name", "ascending");
    expect(ids(table)).toEqual(["beta", "alpha"]);
    expect(sorted).not.toHaveBeenCalled();
  });
  it("stops metadata and notifications after reordering disposes the owner", () => {
    const { ui, star } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const body = required((part(root, "table") as HTMLTableElement).tBodies[0]);
    const append = body.append.bind(body);
    vi.spyOn(body, "append").mockImplementationOnce((...nodes) => {
      append(...nodes);
      star.dispose();
      root.dataset.page = "retired";
    });
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    ui.dataTable.sort(root, "name", "ascending");
    expect(root.dataset.page).toBe("retired");
    expect(sorted).not.toHaveBeenCalled();
  });
  it("ignores detached previous controls before explicit enhancement", () => {
    const { ui } = install();
    const root = fixture("data-table");
    ui.enhance(root);
    const sort = part(root, "sort");
    sort.replaceWith(sort.cloneNode(true));
    const sorted = vi.fn();
    root.addEventListener("jquery-star:data-table:sort", sorted);
    sort.click();
    expect(sorted).not.toHaveBeenCalled();
  });
  it.each(["enhance", "disposed-first"])(
    "retains selection seed history and source row order on adoption through %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const root = fixture("data-table");
      (part(root, "row-select") as HTMLInputElement).checked = true;
      source.ui.enhance(root);
      source.ui.dataTable.sort(root, "name", "ascending");
      const table = part(root, "table") as HTMLTableElement;
      const body = required(table.tBodies[0]);
      const extra = body.insertRow();
      extra.dataset.rowId = "gamma";
      extra.innerHTML =
        '<td><input type="checkbox" data-part="row-select" checked></td><th data-key="name">Gamma</th>';
      destination.owner.document.adoptNode(root);
      if (mode === "disposed-first") source.star.dispose();
      destination.ui.enhance(root);
      source.star.dispose();
      expect(destination.ui.dataTable.selected(root)).toEqual(["beta"]);
      expect((part(extra, "row-select") as HTMLInputElement).checked).toBe(false);
      destination.ui.dataTable.sort(root, "name", "none");
      expect(ids(table)).toEqual(["beta", "alpha", "gamma"]);
    },
  );
});

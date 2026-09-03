import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#data-table")!;
}

function table(): HTMLTableElement {
  return root().querySelector<HTMLTableElement>('table[data-part="table"]')!;
}

function row(id: string): HTMLTableRowElement {
  return table().querySelector<HTMLTableRowElement>(`tr[data-row-id="${id}"]`)!;
}

function visibleRowIds(): string[] {
  return Array.from(table().tBodies[0]!.rows)
    .filter((candidate) => !candidate.hidden)
    .map((candidate) => candidate.dataset.rowId!);
}

function sortButton(key: string): HTMLButtonElement {
  return table().querySelector<HTMLButtonElement>(`th[data-key="${key}"] [data-part="sort"]`)!;
}

function rowSelect(id: string): HTMLInputElement {
  return row(id).querySelector<HTMLInputElement>('[data-part="row-select"]')!;
}

describe("jQuery Star Data Table", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.dataTable.sort('#data-table', 'name', 'descending')">Sort names</button>
        <div id="data-table" data-jqs="data-table" data-page-size="2">
          <div data-part="toolbar">
            <label for="table-filter">Filter systems</label>
            <input id="table-filter" data-part="filter">
            <span data-part="selection-status"></span>
          </div>
          <div data-part="viewport">
            <table data-part="table">
              <caption>UI systems</caption>
              <thead>
                <tr>
                  <th scope="col"><input data-part="select-all" type="checkbox" aria-label="Select visible systems"></th>
                  <th scope="col" data-key="name"><button data-part="sort">Name</button></th>
                  <th scope="col" data-key="score" data-type="number"><button data-part="sort">  Score  </button></th>
                  <th scope="col" data-key=""><button data-part="sort">   </button></th>
                </tr>
              </thead>
              <tbody>
                <tr data-row-id="alpha">
                  <td><input data-part="row-select" type="checkbox" aria-label="Select Alpha"></td>
                  <th scope="row" data-key="name">Alpha</th><td data-key="score" data-value="1,000">10</td>
                </tr>
                <tr data-row-id="beta">
                  <td><input data-part="row-select" type="checkbox" aria-label="Select Beta"></td>
                  <th scope="row" data-key="name">Beta</th><td data-key="score">2</td>
                </tr>
                <tr data-row-id="gamma">
                  <td><input data-part="row-select" type="checkbox" aria-label="Select Gamma"></td>
                  <th scope="row" data-key="name">Gamma</th><td data-key="score">30</td>
                </tr>
                <tr data-row-id="delta">
                  <td><input data-part="row-select" type="checkbox" aria-label="Select Delta"></td>
                  <th scope="row" data-key="name">Delta</th><td data-key="score">2</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div data-part="pagination">
            <button data-part="previous">Previous</button>
            <span data-part="page-status"></span>
            <button data-part="next">Next</button>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps native table semantics and initializes pagination controls", () => {
    expect(table().caption?.textContent).toBe("UI systems");
    expect(table().querySelector('th[data-key="name"]')?.getAttribute("scope")).toBe("col");
    expect(row("alpha").querySelector('th[data-key="name"]')?.getAttribute("scope")).toBe("row");
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);
    expect(root().querySelector('[data-part="page-status"]')?.textContent).toBe("1–2 of 4");
    expect(root().querySelector<HTMLButtonElement>('[data-part="previous"]')?.disabled).toBe(true);
    expect(root().querySelector<HTMLButtonElement>('[data-part="next"]')?.disabled).toBe(false);
    expect(root().hasAttribute("data-sort")).toBe(false);
    expect(root().hasAttribute("data-direction")).toBe(false);
    expect(root().hasAttribute("data-sorts")).toBe(false);
    expect(sortButton("name").dataset.direction).toBe("none");
    expect(sortButton("name").hasAttribute("data-sort-order")).toBe(false);
    expect(sortButton("name").hasAttribute("aria-label")).toBe(false);
    expect(sortButton("").dataset.sortBaseLabel).toBe("Column");
  });

  it("does not rewrite unchanged page or sort metadata during shared enhancement", async () => {
    const mutations = vi.fn();
    const observer = new MutationObserver(mutations);
    observer.observe(root(), {
      attributes: true,
      attributeFilter: [
        "aria-label",
        "aria-sort",
        "data-direction",
        "data-generated-sort-label",
        "data-page-count",
        "data-sort",
        "data-sort-order",
        "data-sorts",
      ],
      subtree: true,
    });

    $.star.ui.enhance(root());
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(mutations).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it("sorts numbers stably and cycles ascending, descending, then source order", () => {
    const beforeSort = vi.fn();
    const sorted = vi.fn();
    const proposedState = vi.fn(() => ({
      ariaSort: table().querySelector('th[data-key="score"]')?.getAttribute("aria-sort"),
      rootDirection: root().dataset.direction,
      rootSort: root().dataset.sort,
    }));
    root().addEventListener("jquery-star:data-table:before-sort", beforeSort);
    root().addEventListener("jquery-star:data-table:before-sort", proposedState);
    root().addEventListener("jquery-star:data-table:sort", sorted);
    sortButton("score").click();
    expect(root().dataset.sort).toBe("score");
    expect(root().dataset.direction).toBe("ascending");
    expect(table().querySelector('th[data-key="score"]')?.getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(sortButton("score").dataset.direction).toBe("ascending");
    expect(sortButton("score").dataset.sortOrder).toBe("1");
    expect(sortButton("score").dataset.generatedSortLabel).toBe("true");
    expect(sortButton("score").dataset.sortBaseLabel).toBe("Score");
    expect(sortButton("score").getAttribute("aria-label")).toBe(
      "Score, sort priority 1, ascending",
    );
    expect(visibleRowIds()).toEqual(["beta", "delta"]);
    expect(beforeSort).toHaveBeenCalledOnce();
    expect(proposedState).toHaveReturnedWith({
      ariaSort: "ascending",
      rootDirection: "ascending",
      rootSort: "score",
    });
    expect(sorted).toHaveBeenCalledOnce();
    const beforeEvent = beforeSort.mock.calls[0]![0] as CustomEvent;
    const sortedEvent = sorted.mock.calls[0]![0] as CustomEvent;
    expect(beforeEvent.cancelable).toBe(true);
    expect(sortedEvent.cancelable).toBe(false);
    expect(sortedEvent.detail).toEqual({
      dataTable: root(),
      direction: "ascending",
      filter: "",
      key: "score",
      page: 1,
      selected: [],
      sorts: [{ direction: "ascending", key: "score" }],
    });

    sortButton("score").click();
    expect(visibleRowIds()).toEqual(["alpha", "gamma"]);
    expect(root().dataset.direction).toBe("descending");

    sortButton("score").click();
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);
    expect(root().hasAttribute("data-sort")).toBe(false);
    expect(root().hasAttribute("data-direction")).toBe(false);
    expect(root().hasAttribute("data-sorts")).toBe(false);
    expect(table().querySelector('th[data-key="score"]')?.hasAttribute("aria-sort")).toBe(false);
    expect(sortButton("score").dataset.direction).toBe("none");
    expect(sortButton("score").hasAttribute("data-sort-order")).toBe(false);
    expect(sortButton("score").hasAttribute("aria-label")).toBe(false);
    expect(sortButton("score").hasAttribute("data-generated-sort-label")).toBe(false);
  });

  it("builds an ordered multi-column sort with Shift or the additive API", () => {
    sortButton("score").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    sortButton("name").dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));

    expect($.star.ui.dataTable.sorts(root())).toEqual([
      { direction: "ascending", key: "score" },
      { direction: "ascending", key: "name" },
    ]);
    expect(sortButton("score").dataset.sortOrder).toBe("1");
    expect(sortButton("name").dataset.sortOrder).toBe("2");
    expect(table().querySelector('th[data-key="score"]')?.getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(table().querySelector('th[data-key="name"]')?.hasAttribute("aria-sort")).toBe(false);
    expect(sortButton("name").getAttribute("aria-label")).toContain("sort priority 2, ascending");
    expect(root().dataset.sorts).toBe(
      '[{"direction":"ascending","key":"score"},{"direction":"ascending","key":"name"}]',
    );

    sortButton("name").dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    expect(visibleRowIds()).toEqual(["delta", "beta"]);

    $.star.ui.dataTable.sort(root(), "score", "descending", true);
    expect($.star.ui.dataTable.sorts(root())).toEqual([
      { direction: "descending", key: "name" },
      { direction: "descending", key: "score" },
    ]);

    $.star.ui.dataTable.sort(root(), "name", "descending");
    expect($.star.ui.dataTable.sorts(root())).toEqual([{ direction: "descending", key: "name" }]);
    expect(sortButton("score").dataset.direction).toBe("none");
    expect(sortButton("score").hasAttribute("data-sort-order")).toBe(false);
  });

  it("preserves authored sort labels while generated labels follow sort state", () => {
    sortButton("name").setAttribute("aria-label", "Sort by project name");
    $.star.ui.dataTable.sort(root(), "name", "ascending");
    expect(sortButton("name").getAttribute("aria-label")).toBe("Sort by project name");
    expect(sortButton("name").hasAttribute("data-generated-sort-label")).toBe(false);

    $.star.ui.dataTable.sort(root(), "score", "ascending");
    expect(sortButton("score").getAttribute("aria-label")).toBe(
      "Score, sort priority 1, ascending",
    );
    $.star.ui.dataTable.sort(root(), "score", "descending");
    expect(sortButton("score").getAttribute("aria-label")).toBe(
      "Score, sort priority 1, descending",
    );
  });

  it("derives generated labels from trimmed text, keys, and the column fallback", () => {
    const fresh = document.createElement("div");
    fresh.dataset.jqs = "data-table";
    fresh.dataset.sorts = '[{"direction":"ascending","key":"score"}]';
    fresh.innerHTML = `
      <table data-part="table">
        <thead><tr>
          <th data-key="score"><button data-part="sort">   </button></th>
          <th data-key=""><button data-part="sort"></button></th>
        </tr></thead>
        <tbody><tr data-row-id="one"><td data-key="score">1</td><td></td></tr></tbody>
      </table>
    `;
    document.body.append(fresh);
    $.star.ui.enhance(fresh);

    const score = fresh.querySelector<HTMLElement>('th[data-key="score"] [data-part="sort"]')!;
    const unnamed = fresh.querySelector<HTMLElement>('th[data-key=""] [data-part="sort"]')!;
    expect(score.dataset.sortBaseLabel).toBe("score");
    expect(score.getAttribute("aria-label")).toBe("score, sort priority 1, ascending");
    expect(score.dataset.generatedSortLabel).toBe("true");
    expect(unnamed.dataset.sortBaseLabel).toBe("Column");
    expect(unnamed.hasAttribute("aria-label")).toBe(false);
  });

  it("normalizes authored multi-sort data and falls back from malformed JSON", () => {
    root().dataset.sorts = "{not-json";
    root().dataset.sort = "name";
    root().dataset.direction = "descending";
    $.star.ui.enhance(root());
    expect($.star.ui.dataTable.sorts(root())).toEqual([{ direction: "descending", key: "name" }]);

    root().dataset.sorts = JSON.stringify([
      null,
      [],
      true,
      7,
      "invalid",
      { direction: "ascending", key: 7 },
      { direction: "ascending", key: "" },
      { direction: "sideways", key: "score" },
      { direction: "ascending", key: "score" },
      { direction: "descending", key: "score" },
    ]);
    $.star.ui.enhance(root());
    expect($.star.ui.dataTable.sorts(root())).toEqual([{ direction: "ascending", key: "score" }]);

    delete root().dataset.sorts;
    root().dataset.sort = " name ";
    root().dataset.direction = "ascending";
    $.star.ui.enhance(root());
    expect($.star.ui.dataTable.sorts(root())).toEqual([{ direction: "ascending", key: "name" }]);
  });

  it("filters all rows and resets pagination to the first page", () => {
    const filtered = vi.fn();
    root().addEventListener("jquery-star:data-table:filter", filtered);
    $.star.ui.dataTable.sort(root(), "name", "ascending");
    $.star.ui.dataTable.next(root());
    expect(root().dataset.page).toBe("2");
    const filter = root().querySelector<HTMLInputElement>('[data-part="filter"]')!;
    filter.value = "gamma";
    filter.dispatchEvent(new Event("input", { bubbles: true }));

    expect(root().dataset.page).toBe("1");
    expect(visibleRowIds()).toEqual(["gamma"]);
    expect(root().querySelector('[data-part="page-status"]')?.textContent).toBe("1–1 of 1");
    expect((filtered.mock.calls[0]![0] as CustomEvent).detail.key).toBe("name");
  });

  it("paginates through APIs, controls, and named actions", () => {
    $.star.ui.dataTable.next(root());
    expect(visibleRowIds()).toEqual(["gamma", "delta"]);
    expect(root().dataset.page).toBe("2");
    root().querySelector<HTMLButtonElement>('[data-part="previous"]')!.click();
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);

    $("#external").trigger("click");
    expect(visibleRowIds()).toEqual(["gamma", "delta"]);
    expect(root().dataset.direction).toBe("descending");
  });

  it("selects the visible page and retains stable row IDs across pages", () => {
    const all = root().querySelector<HTMLInputElement>('[data-part="select-all"]')!;
    all.checked = true;
    all.dispatchEvent(new Event("change", { bubbles: true }));
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha", "beta"]);
    expect(root().querySelector('[data-part="selection-status"]')?.textContent).toBe("2 selected");

    $.star.ui.dataTable.next(root());
    rowSelect("gamma").checked = true;
    rowSelect("gamma").dispatchEvent(new Event("change", { bubbles: true }));
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha", "beta", "gamma"]);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
  });

  it("seeds authored checked rows during the first enhancement", () => {
    const fresh = document.createElement("div");
    fresh.dataset.jqs = "data-table";
    fresh.innerHTML = `
      <table data-part="table"><tbody><tr data-row-id="authored">
        <td><input data-part="row-select" type="checkbox" checked></td>
      </tr></tbody></table>
    `;
    document.body.append(fresh);

    $.star.ui.enhance(fresh);

    expect($.star.ui.dataTable.selected(fresh)).toEqual(["authored"]);
  });

  it("keeps selection when server markup replaces the current rows", () => {
    rowSelect("alpha").checked = true;
    rowSelect("alpha").dispatchEvent(new Event("change", { bubbles: true }));
    table().tBodies[0]!.innerHTML = `
      <tr data-row-id="alpha">
        <td><input data-part="row-select" type="checkbox" aria-label="Select Alpha refreshed"></td>
        <th scope="row" data-key="name">Alpha refreshed</th><td data-key="score">11</td>
      </tr>
      <tr data-row-id="epsilon">
        <td><input data-part="row-select" type="checkbox" aria-label="Select Epsilon" checked></td>
        <th scope="row" data-key="name">Epsilon</th><td data-key="score">40</td>
      </tr>
    `;
    $.star.ui.enhance(root());

    expect(rowSelect("alpha").checked).toBe(true);
    expect(rowSelect("epsilon").checked).toBe(false);
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha"]);
  });

  it("ignores nested and unrelated checkboxes and removes stale selection listeners", () => {
    const selection = vi.fn();
    root().addEventListener("jquery-star:data-table:selection-change", selection);
    $.star.ui.enhance(root());
    $.star.ui.enhance(root());

    rowSelect("alpha").checked = true;
    rowSelect("alpha").dispatchEvent(new Event("change", { bubbles: true }));
    expect(selection).toHaveBeenCalledOnce();
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha"]);

    const unrelated = document.createElement("input");
    unrelated.type = "checkbox";
    root().append(unrelated);
    unrelated.checked = true;
    unrelated.dispatchEvent(new Event("change", { bubbles: true }));
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha"]);
    expect(selection).toHaveBeenCalledOnce();

    const nested = document.createElement("div");
    nested.dataset.jqs = "data-table";
    nested.innerHTML = `
      <table data-part="table"><tbody><tr data-row-id="nested">
        <td><input data-part="row-select" type="checkbox"></td>
      </tr></tbody></table>
    `;
    root().append(nested);
    $.star.ui.enhance(nested);
    const nestedSelect = nested.querySelector<HTMLInputElement>('[data-part="row-select"]')!;
    nestedSelect.checked = true;
    nestedSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha"]);
    expect($.star.ui.dataTable.selected(nested)).toEqual(["nested"]);
    expect(selection).toHaveBeenCalledTimes(2);
  });

  it("runs an implicit-root named sort action from inside the table", async () => {
    const instance = $("#app").star("instance")!;
    await instance.run("ui.dataTable.sort", {
      args: ["score", "ascending"],
      element: sortButton("score"),
    });
    expect($.star.ui.dataTable.sorts(root())).toEqual([{ direction: "ascending", key: "score" }]);
    expect(visibleRowIds()).toEqual(["beta", "delta"]);
  });

  it("supports cancelable sorting and manual server processing", () => {
    const prevent = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:data-table:before-sort", prevent, { once: true });
    $.star.ui.dataTable.sort(root(), "name", "descending");
    expect(prevent).toHaveBeenCalledOnce();
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);
    expect($.star.ui.dataTable.sorts(root())).toEqual([]);
    expect(root().hasAttribute("data-sort")).toBe(false);
    expect(root().hasAttribute("data-direction")).toBe(false);
    expect(root().hasAttribute("data-sorts")).toBe(false);
    expect(sortButton("name").dataset.direction).toBe("none");
    expect(sortButton("name").hasAttribute("data-sort-order")).toBe(false);
    expect(sortButton("name").hasAttribute("aria-label")).toBe(false);

    root().dataset.processing = "manual";
    $.star.ui.enhance(root());
    $.star.ui.dataTable.sort(root(), "name", "descending");
    expect(Array.from(table().tBodies[0]!.rows, (candidate) => candidate.dataset.rowId)).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
    expect(root().dataset.sort).toBe("name");
  });
});

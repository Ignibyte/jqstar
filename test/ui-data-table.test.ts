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
                  <th scope="col" data-key="score" data-type="number"><button data-part="sort">Score</button></th>
                </tr>
              </thead>
              <tbody>
                <tr data-row-id="alpha">
                  <td><input data-part="row-select" type="checkbox" aria-label="Select Alpha"></td>
                  <th scope="row" data-key="name">Alpha</th><td data-key="score">10</td>
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
                  <th scope="row" data-key="name">Delta</th><td data-key="score">20</td>
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
  });

  it("sorts numbers stably and cycles ascending, descending, then source order", () => {
    sortButton("score").click();
    expect(root().dataset.sort).toBe("score");
    expect(root().dataset.direction).toBe("ascending");
    expect(table().querySelector('th[data-key="score"]')?.getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(visibleRowIds()).toEqual(["beta", "alpha"]);

    sortButton("score").click();
    expect(visibleRowIds()).toEqual(["gamma", "delta"]);
    expect(root().dataset.direction).toBe("descending");

    sortButton("score").click();
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);
    expect(root().hasAttribute("data-sort")).toBe(false);
    expect(table().querySelector('th[data-key="score"]')?.hasAttribute("aria-sort")).toBe(false);
  });

  it("filters all rows and resets pagination to the first page", () => {
    $.star.ui.dataTable.next(root());
    expect(root().dataset.page).toBe("2");
    const filter = root().querySelector<HTMLInputElement>('[data-part="filter"]')!;
    filter.value = "gamma";
    filter.dispatchEvent(new Event("input", { bubbles: true }));

    expect(root().dataset.page).toBe("1");
    expect(visibleRowIds()).toEqual(["gamma"]);
    expect(root().querySelector('[data-part="page-status"]')?.textContent).toBe("1–1 of 1");
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

  it("keeps selection when server markup replaces the current rows", () => {
    rowSelect("alpha").checked = true;
    rowSelect("alpha").dispatchEvent(new Event("change", { bubbles: true }));
    table().tBodies[0]!.innerHTML = `
      <tr data-row-id="alpha">
        <td><input data-part="row-select" type="checkbox" aria-label="Select Alpha refreshed"></td>
        <th scope="row" data-key="name">Alpha refreshed</th><td data-key="score">11</td>
      </tr>
      <tr data-row-id="epsilon">
        <td><input data-part="row-select" type="checkbox" aria-label="Select Epsilon"></td>
        <th scope="row" data-key="name">Epsilon</th><td data-key="score">40</td>
      </tr>
    `;
    $.star.ui.enhance(root());

    expect(rowSelect("alpha").checked).toBe(true);
    expect($.star.ui.dataTable.selected(root())).toEqual(["alpha"]);
  });

  it("supports cancelable sorting and manual server processing", () => {
    const prevent = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:data-table:before-sort", prevent, { once: true });
    $.star.ui.dataTable.sort(root(), "name", "descending");
    expect(prevent).toHaveBeenCalledOnce();
    expect(visibleRowIds()).toEqual(["alpha", "beta"]);

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

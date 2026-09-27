import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function element(root: ParentNode, selector: string): HTMLElement {
  const result = root.querySelector<HTMLElement>(selector);
  if (!result) throw new Error(`Missing fixture part: ${selector}`);
  return result;
}

afterEach(() => document.body.replaceChildren());

describe("Generated identities after current-part insertion", () => {
  it.each(["combobox", "tree"])("preserves distinct %s IDs across insertions", (kind) => {
    const root = document.createElement("div");
    root.dataset.jqs = kind;
    root.id = `identity-${kind}`;
    const item = (value: string, id = "") =>
      kind === "combobox"
        ? `<div data-part="option" data-value="${value}" ${id ? `id="${id}"` : ""}>${value}</div>`
        : `<div data-part="item" data-value="${value}" ${id ? `id="${id}"` : ""}><div data-part="row"><span data-part="label">${value}</span></div></div>`;
    root.innerHTML =
      kind === "combobox"
        ? `<input data-part="control"><div data-part="content">${item("a")}${item("b", "authored-option")}</div>`
        : `${item("a")}${item("b", "authored-item")}`;
    $.star.ui.enhance(root);
    const container = kind === "combobox" ? element(root, '[data-part="content"]') : root;
    const selector = kind === "combobox" ? '[data-part="option"]' : '[data-part="item"]';
    const originals = [...container.querySelectorAll(selector)].map(
      (node) => [node, node.id] as const,
    );
    for (const [position, value] of [
      ["afterbegin", "c"],
      ["beforeend", "d"],
      ["afterbegin", "e"],
    ] as const) {
      container.insertAdjacentHTML(position, item(value));
      $.star.ui.enhance(root);
      const nodes = [...container.querySelectorAll(selector)];
      expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
      for (const [node, id] of originals) expect(node.id).toBe(id);
    }
  });
});

it.each(["dblclick", "Enter"])("refuses disabled Tree activation through %s", (action) => {
  const root = document.createElement("ul");
  root.dataset.jqs = "tree";
  root.innerHTML =
    '<li data-part="item" data-value="a" data-disabled><div data-part="row"><span data-part="label">A</span></div></li>';
  $.star.ui.enhance(root);
  const activate = vi.fn();
  root.addEventListener("jquery-star:tree:activate", activate);
  const item = element(root, '[data-part="item"]');
  const invoke = () =>
    action === "Enter"
      ? item.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
        )
      : element(root, '[data-part="row"]').dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true }),
        );
  invoke();
  expect(activate).not.toHaveBeenCalled();
  item.removeAttribute("data-disabled");
  item.removeAttribute("aria-disabled");
  $.star.ui.enhance(root);
  invoke();
  expect(activate).toHaveBeenCalledOnce();
});

function tableFixture() {
  const root = document.createElement("div");
  root.dataset.jqs = "data-table";
  root.dataset.mode = "manual";
  root.innerHTML =
    '<table data-part="table"><thead><tr><th><input data-part="select-all" type="checkbox"></th></tr></thead><tbody><tr data-row-id="a"><td><input data-part="row-select" type="checkbox"></td></tr><tr data-row-id="b"><td><input data-part="row-select" type="checkbox" disabled checked></td></tr></tbody></table>';
  $.star.ui.enhance(root);
  return root;
}

it("leaves disabled Data Table selection unchanged during bulk selection and clearing", () => {
  const root = tableFixture();
  const all = element(root, '[data-part="select-all"]') as HTMLInputElement;
  const locked = element(root, '[data-row-id="b"] input') as HTMLInputElement;
  expect($.star.ui.dataTable.selected(root)).toEqual(["b"]);
  all.checked = true;
  all.dispatchEvent(new Event("change", { bubbles: true }));
  expect($.star.ui.dataTable.selected(root)).toEqual(["b", "a"]);
  expect(all.checked).toBe(true);
  expect(all.indeterminate).toBe(false);
  all.checked = false;
  all.dispatchEvent(new Event("change", { bubbles: true }));
  expect($.star.ui.dataTable.selected(root)).toEqual(["b"]);
  expect(locked.checked).toBe(true);
  locked.checked = false;
  locked.dispatchEvent(new Event("change", { bubbles: true }));
  expect($.star.ui.dataTable.selected(root)).toEqual(["b"]);
});

it("disables Data Table bulk selection when every visible row is disabled", () => {
  const root = tableFixture();
  element(root, '[data-row-id="a"]').remove();
  $.star.ui.enhance(root);
  const all = element(root, '[data-part="select-all"]') as HTMLInputElement;
  expect(all.disabled).toBe(true);
  expect(all.checked).toBe(false);
  expect(all.indeterminate).toBe(false);
});

it("preserves selected page identities without seeding later replacement checkboxes", () => {
  const root = tableFixture();
  const body = element(root, "tbody") as HTMLTableSectionElement;
  for (const id of ["c", "d", "b"]) {
    body.innerHTML = `<tr data-row-id="${id}"><td><input data-part="row-select" type="checkbox" ${id === "b" ? "" : "checked"}></td></tr>`;
    $.star.ui.enhance(root);
    expect($.star.ui.dataTable.selected(root)).toEqual(["b"]);
    expect((element(body, "input") as HTMLInputElement).checked).toBe(id === "b");
  }
});

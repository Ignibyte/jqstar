import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function pagination(): HTMLElement {
  return document.querySelector<HTMLElement>("#pagination")!;
}

function pageLink(page: number): HTMLAnchorElement {
  return pagination().querySelector<HTMLAnchorElement>(`[data-part="page"][data-page="${page}"]`)!;
}

describe("jQuery Star Pagination", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.pagination.page('#pagination', 3)">Last page</button>
        <nav
          id="pagination"
          data-jqs="pagination"
          data-page="1"
          data-page-count="3"
          data-navigation="manual"
          aria-label="Results pages"
        >
          <ul>
            <li><a data-part="previous" href="?page=1">Previous</a></li>
            <li><a data-part="page" data-page="1" href="?page=1">1</a></li>
            <li><a data-part="page" data-page="2" href="?page=2">2</a></li>
            <li><a data-part="page" data-page="3" href="?page=3">3</a></li>
            <li><a data-part="next" href="?page=2">Next</a></li>
          </ul>
          <p data-part="status" aria-live="polite"></p>
        </nav>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("synchronizes current, boundary, state, and status semantics", () => {
    expect($.star.ui.pagination.page(pagination())).toBe(1);
    expect($.star.ui.pagination.pageCount(pagination())).toBe(3);
    expect(pagination().dataset.state).toBe("first");
    expect(pageLink(1).getAttribute("aria-current")).toBe("page");
    expect(pageLink(2).hasAttribute("aria-current")).toBe(false);
    expect(
      pagination().querySelector('[data-part="previous"]')?.getAttribute("aria-disabled"),
    ).toBe("true");
    expect(pagination().querySelector('[data-part="next"]')?.hasAttribute("aria-disabled")).toBe(
      false,
    );
    expect(pagination().querySelector('[data-part="status"]')?.textContent).toBe("Page 1 of 3");
  });

  it("changes pages through controls, APIs, and named actions", () => {
    const changes = vi.fn();
    pagination().addEventListener("jquery-star:pagination:change", changes);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(pageLink(2).dispatchEvent(click)).toBe(false);
    expect($.star.ui.pagination.page(pagination())).toBe(2);
    expect(pagination().dataset.state).toBe("middle");

    $.star.ui.pagination.previous(pagination());
    expect($.star.ui.pagination.page(pagination())).toBe(1);
    $("#external").trigger("click");
    expect($.star.ui.pagination.page(pagination())).toBe(3);
    expect(pagination().dataset.state).toBe("last");
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it("allows progressive native links when manual navigation is absent", () => {
    pagination().removeAttribute("data-navigation");
    let preventedByPagination = true;
    pageLink(2).addEventListener(
      "click",
      (event) => {
        preventedByPagination = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    pageLink(2).dispatchEvent(click);
    expect(preventedByPagination).toBe(false);
    expect($.star.ui.pagination.page(pagination())).toBe(2);
  });

  it("honors cancelable changes and disabled roots", () => {
    pagination().addEventListener(
      "jquery-star:pagination:before-change",
      (event) => event.preventDefault(),
      { once: true },
    );
    $.star.ui.pagination.next(pagination());
    expect($.star.ui.pagination.page(pagination())).toBe(1);

    pagination().dataset.disabled = "true";
    $.star.ui.enhance(pagination());
    $.star.ui.pagination.goTo(pagination(), 3);
    expect($.star.ui.pagination.page(pagination())).toBe(1);
    expect(pagination().querySelector('[data-part="next"]')?.getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("accepts server-patched page metadata and clamps removed pages", () => {
    pagination().dataset.page = "3";
    $.star.ui.enhance(pagination());
    expect($.star.ui.pagination.page(pagination())).toBe(3);

    pagination().dataset.pageCount = "2";
    $.star.ui.enhance(pagination());
    expect($.star.ui.pagination.page(pagination())).toBe(2);
    expect(pagination().dataset.page).toBe("2");
    expect(pagination().querySelector('[data-part="status"]')?.textContent).toBe("Page 2 of 2");
  });

  it("rejects malformed authored page controls", () => {
    const malformed = document.createElement("nav");
    malformed.dataset.jqs = "pagination";
    malformed.innerHTML = '<a data-part="page" data-page="two">Two</a>';
    expect(() => $.star.ui.enhance(malformed)).toThrow("page controls need a positive data-page");
  });
});

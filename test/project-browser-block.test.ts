import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/project-browser";

interface RequestSignals {
  projectBrowserDirection: string;
  projectBrowserPage: number;
  projectBrowserQuery: string;
  projectBrowserSort: string;
}

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/project-browser.html"), "utf8");
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-block="project-browser"]')!;
}

function responseFor(signals: RequestSignals): Response {
  const page = signals.projectBrowserPage;
  const rows =
    page === 2
      ? '<tr data-row-id="server-runtime"><td><input data-part="row-select" type="checkbox" aria-label="Select Server Runtime"></td><th scope="row" data-key="name">Server Runtime</th><td data-key="owner">Platform</td><td data-key="status">Planning</td><td data-key="updated">2026-08-22</td></tr>'
      : '<tr data-row-id="jqstar"><td><input data-part="row-select" type="checkbox" aria-label="Select jqstar refreshed"></td><th scope="row" data-key="name">jqstar refreshed</th><td data-key="owner">Platform</td><td data-key="status">Active</td><td data-key="updated">2026-08-28</td></tr>';
  const pages = [1, 2, 3]
    .map(
      (value) =>
        `<li><a data-part="page" data-page="${value}" href="?page=${value}"${value === page ? ' aria-current="page"' : ""}>${value}</a></li>`,
    )
    .join("");
  return ServerSentEventGenerator.stream((stream) => {
    stream.patchSignals(
      JSON.stringify({
        projectBrowserCount: 12,
        projectBrowserMessage: `12 matching projects. Page ${page} of 3.`,
        projectBrowserPage: page,
      }),
    );
    stream.patchElements(rows, { selector: "#project-browser-rows", mode: "inner" });
    stream.patchElements(
      `<nav id="project-browser-pagination" data-jqs="pagination" data-navigation="manual" data-page="${page}" data-page-count="3" data-on:jquery-star:pagination:change="@projectBrowser.page" aria-label="Project results pages"><ul><li><a data-part="previous" href="?page=${Math.max(1, page - 1)}">Previous</a></li>${pages}<li><a data-part="next" href="?page=${Math.min(3, page + 1)}">Next</a></li></ul><p data-part="status">Page ${page} of 3</p></nav>`,
      { selector: "#project-browser-pagination", mode: "outer" },
    );
  });
}

describe("Project Browser source block", () => {
  let requests: RequestSignals[];

  beforeEach(() => {
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        const { signal: _signal, ...requestInit } = init;
        const read = await ServerSentEventGenerator.readSignals(new Request(url, requestInit));
        if (!read.success) throw new Error(read.error);
        const signals = read.signals as unknown as RequestSignals;
        requests.push(signals);
        return responseFor(signals);
      }),
    );
    document.body.innerHTML = blockHTML;
    $.star.ui.enhance(document);
    $(root()).star();
  });

  afterEach(() => {
    $(root()).star("destroy");
    vi.unstubAllGlobals();
  });

  it("requests a page and applies official SDK row, signal, and Pagination patches", async () => {
    root()
      .querySelector<HTMLAnchorElement>('[data-jqs="pagination"] [data-page="2"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    await vi.waitFor(() =>
      expect(root().querySelector('[data-row-id="server-runtime"]')?.textContent).toContain(
        "Server Runtime",
      ),
    );
    expect(requests).toEqual([
      {
        projectBrowserDirection: "ascending",
        projectBrowserPage: 2,
        projectBrowserQuery: "",
        projectBrowserSort: "name",
      },
    ]);
    expect($.star.ui.pagination.page("#project-browser-pagination")).toBe(2);
    await vi.waitFor(() =>
      expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Page 2 of 3"),
    );
    expect($('[data-text="$projectBrowserMessage"]').text()).toBe(
      "12 matching projects. Page 2 of 3.",
    );
  });

  it("keeps stable Data Table selection through a server row replacement", async () => {
    const selected = root().querySelector<HTMLInputElement>(
      '[data-row-id="jqstar"] [data-part="row-select"]',
    )!;
    selected.checked = true;
    selected.dispatchEvent(new Event("change", { bubbles: true }));

    $('[data-on\\:click="@projectBrowser.refresh"]').trigger("click");

    await vi.waitFor(() =>
      expect(root().querySelector('[data-row-id="jqstar"] th')?.textContent).toBe(
        "jqstar refreshed",
      ),
    );
    expect(
      root().querySelector<HTMLInputElement>('[data-row-id="jqstar"] [data-part="row-select"]')
        ?.checked,
    ).toBe(true);
    expect($.star.ui.dataTable.selected("#project-browser-table")).toEqual(["jqstar"]);
  });
});

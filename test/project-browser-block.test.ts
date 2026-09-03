import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/project-browser";

interface RequestSignals {
  projectBrowserGroupBy: "none" | "owner" | "status";
  projectBrowserMode: "page" | "virtual";
  projectBrowserOwner: string;
  projectBrowserPage: number;
  projectBrowserPageSize: number;
  projectBrowserQuery: string;
  projectBrowserRequestId: number;
  projectBrowserSorts: Array<{
    direction: "ascending" | "descending";
    key: string;
  }>;
  projectBrowserStatus: string;
  projectBrowserWindowSize: number;
  projectBrowserWindowStart: number;
}

interface EditRequest {
  name: string;
  owner: string;
  status: string;
  version: number;
}

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/project-browser.html"), "utf8");
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-block="project-browser"]')!;
}

function controlFor(name: string): HTMLSelectElement {
  return root().querySelector<HTMLSelectElement>(`[data-project-browser-control="${name}"]`)!;
}

function requestSignals(overrides: Partial<RequestSignals> = {}): RequestSignals {
  return {
    projectBrowserGroupBy: "none",
    projectBrowserMode: "page",
    projectBrowserOwner: "all",
    projectBrowserPage: 1,
    projectBrowserPageSize: 5,
    projectBrowserQuery: "",
    projectBrowserRequestId: 1,
    projectBrowserSorts: [{ direction: "descending", key: "updated" }],
    projectBrowserStatus: "all",
    projectBrowserWindowSize: 40,
    projectBrowserWindowStart: 0,
    ...overrides,
  };
}

function rowHTML(id: string, name: string): string {
  return `<tr data-row-id="${id}" data-project-version="1"><td><input data-part="row-select" type="checkbox" aria-label="Select ${name}"></td><th scope="row" data-key="name" data-column="name"><button data-project-browser-expand data-project-id="${id}" data-on:click="@projectBrowser.expand" type="button" aria-expanded="false" aria-controls="project-browser-details-${id}"><span aria-hidden="true">›</span>${name}</button></th><td data-key="owner" data-column="owner">Platform</td><td data-key="status" data-column="status">Planning</td><td data-key="updated" data-column="updated">2026-08-22</td></tr><tr id="project-browser-details-${id}" data-project-browser-details="${id}" hidden><td colspan="5"><div data-project-browser-part="row-details"><p>Durable project details.</p><form data-project-browser-edit="${id}" data-on:submit__prevent="@projectBrowser.save"><label>Project name<input name="name" value="${name}" required></label><label>Owner<select name="owner"><option value="Platform">Platform</option></select></label><label>Status<select name="status"><option value="planning">Planning</option></select></label><input name="version" type="hidden" value="1"><button type="submit">Save changes</button></form></div></td></tr>`;
}

function responseFor(signals: RequestSignals): Response {
  const page = signals.projectBrowserPage;
  const projectRows =
    page === 2
      ? rowHTML("server-runtime", "Server Runtime")
      : rowHTML("jqstar", "jqstar refreshed");
  const rows =
    signals.projectBrowserGroupBy === "none"
      ? projectRows
      : `<tr data-project-browser-group="Platform"><th colspan="5"><button data-project-browser-group-toggle="Platform" data-on:click="@projectBrowser.groupToggle" type="button" aria-expanded="true">Platform <span>12 projects</span></button></th></tr>${projectRows}`;
  const pages = [1, 2, 3, 4, 5, 6]
    .map(
      (value) =>
        `<li><a data-part="page" data-page="${value}" href="?page=${value}"${value === page ? ' aria-current="page"' : ""}>${value}</a></li>`,
    )
    .join("");
  return ServerSentEventGenerator.stream((stream) => {
    stream.patchSignals(
      JSON.stringify({
        projectBrowserActiveFilters: Number(signals.projectBrowserOwner !== "all"),
        projectBrowserCount: 30,
        projectBrowserGroupBy: signals.projectBrowserGroupBy,
        projectBrowserMessage: `Showing 1–${signals.projectBrowserPageSize} of 30 matching projects.`,
        projectBrowserMode: signals.projectBrowserMode,
        projectBrowserOwner: signals.projectBrowserOwner,
        projectBrowserPage: page,
        projectBrowserPageSize: signals.projectBrowserPageSize,
        projectBrowserRangeEnd: signals.projectBrowserPageSize,
        projectBrowserRangeStart: 1,
        projectBrowserRequestId: signals.projectBrowserRequestId,
        projectBrowserSorts: signals.projectBrowserSorts,
        projectBrowserStatus: signals.projectBrowserStatus,
        projectBrowserWindowSize: signals.projectBrowserWindowSize,
        projectBrowserWindowStart: signals.projectBrowserWindowStart,
      }),
    );
    stream.patchElements(rows, { selector: "#project-browser-rows", mode: "inner" });
    stream.patchElements(
      `<nav id="project-browser-pagination" data-jqs="pagination" data-navigation="manual" data-page="${page}" data-page-count="6" data-on:jquery-star:pagination:change="@projectBrowser.page" aria-label="Project results pages"><ul><li><a data-part="previous" href="?page=${Math.max(1, page - 1)}">Previous</a></li>${pages}<li><a data-part="next" href="?page=${Math.min(6, page + 1)}">Next</a></li></ul><p data-part="status">Page ${page} of 6</p></nav>`,
      { selector: "#project-browser-pagination", mode: "outer" },
    );
  });
}

describe("Project Browser source block", () => {
  let edits: EditRequest[];
  let requests: RequestSignals[];

  beforeEach(() => {
    edits = [];
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        if (init.method === "PATCH") {
          const edit = JSON.parse(String(init.body)) as EditRequest;
          edits.push(edit);
          return new Response(
            JSON.stringify({
              message: `${edit.name} saved at version 2.`,
              project: { name: edit.name, version: 2 },
              status: "updated",
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
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
    expect(requests).toEqual([requestSignals({ projectBrowserPage: 2 })]);
    expect($.star.ui.pagination.page("#project-browser-pagination")).toBe(2);
    await vi.waitFor(() =>
      expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Page 2 of 6"),
    );
    expect($('[data-text="$projectBrowserMessage"]').text()).toBe(
      "Showing 1–5 of 30 matching projects.",
    );
  });

  it("sends facet and page-size state as one canonical server query", async () => {
    const owner = root().querySelector<HTMLSelectElement>(
      '[data-project-browser-control="owner"]',
    )!;
    owner.value = "Runtime";
    owner.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      projectBrowserOwner: "Runtime",
      projectBrowserPage: 1,
      projectBrowserPageSize: 5,
    });

    const pageSize = root().querySelector<HTMLSelectElement>(
      '[data-project-browser-control="page-size"]',
    )!;
    pageSize.value = "10";
    pageSize.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({
      projectBrowserOwner: "Runtime",
      projectBrowserPage: 1,
      projectBrowserPageSize: 10,
    });
  });

  it("submits search controls and clears every filter through named actions", async () => {
    const query = root().querySelector<HTMLInputElement>("#project-browser-query")!;
    query.value = "runtime";
    query.dispatchEvent(new Event("input", { bubbles: true }));
    controlFor("owner").value = "Runtime";
    controlFor("status").value = "active";
    root()
      .querySelector<HTMLFormElement>('[data-project-browser-part="search"]')!
      .dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      projectBrowserOwner: "Runtime",
      projectBrowserPage: 1,
      projectBrowserQuery: "runtime",
      projectBrowserStatus: "active",
      projectBrowserWindowStart: 0,
    });

    await $(root()).star("instance")!.run("projectBrowser.clearFilters");
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({
      projectBrowserOwner: "all",
      projectBrowserPage: 1,
      projectBrowserQuery: "",
      projectBrowserStatus: "all",
      projectBrowserWindowStart: 0,
    });
    expect(query.value).toBe("");
    expect(controlFor("owner").value).toBe("all");
    expect(controlFor("status").value).toBe("all");
  });

  it("sends ordered multi-column sorting and exposes each sort priority", async () => {
    const ownerSort = root().querySelector<HTMLButtonElement>(
      'th[data-key="owner"] [data-part="sort"]',
    )!;
    ownerSort.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]!.projectBrowserSorts).toEqual([
      { direction: "descending", key: "updated" },
      { direction: "ascending", key: "owner" },
    ]);
    expect(ownerSort.dataset.sortOrder).toBe("2");

    ownerSort.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.projectBrowserSorts).toEqual([
      { direction: "descending", key: "updated" },
      { direction: "descending", key: "owner" },
    ]);
  });

  it("groups rows, collapses aggregates, and requests bounded virtual windows", async () => {
    const group = root().querySelector<HTMLSelectElement>(
      '[data-project-browser-control="group"]',
    )!;
    group.value = "owner";
    group.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      projectBrowserGroupBy: "owner",
      projectBrowserWindowStart: 0,
    });
    const groupButton = await vi.waitFor(() => {
      const button = root().querySelector<HTMLButtonElement>(
        '[data-project-browser-group-toggle="Platform"]',
      );
      expect(button).not.toBeNull();
      return button!;
    });
    groupButton.click();
    expect(root().querySelector<HTMLTableRowElement>('[data-row-id="jqstar"]')?.hidden).toBe(true);
    expect(groupButton.getAttribute("aria-expanded")).toBe("false");

    const mode = controlFor("mode");
    mode.value = "virtual";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({
      projectBrowserMode: "virtual",
      projectBrowserWindowSize: 40,
    });
    const viewport = root().querySelector<HTMLElement>('[data-part="viewport"]')!;
    viewport.scrollTop = 1_040;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]!.projectBrowserWindowStart).toBe(10);
  });

  it("reorders and pins columns through keyboard-operable layout controls", () => {
    root()
      .querySelector<HTMLButtonElement>(
        '[data-column-item="updated"] [data-column-move="previous"]',
      )!
      .click();
    expect(
      Array.from(root().querySelectorAll<HTMLTableCellElement>("thead [data-column]"), (cell) =>
        cell.getAttribute("data-column"),
      ),
    ).toEqual(["name", "owner", "updated", "status"]);

    const pin = root().querySelector<HTMLButtonElement>('[data-column-pin="owner"]')!;
    pin.click();
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    expect(root().querySelector('th[data-column="owner"]')?.getAttribute("data-pinned")).toBe(
      "left",
    );

    pin.click();
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(root().querySelector('th[data-column="owner"]')?.hasAttribute("data-pinned")).toBe(
      false,
    );
  });

  it("reorders columns through drag actions and the event-target fallback", async () => {
    const source = root().querySelector<HTMLElement>('[data-column-item="updated"]')!;
    const target = root().querySelector<HTMLElement>('[data-column-item="owner"]')!;
    const dataTransfer = {
      dropEffect: "none",
      effectAllowed: "none",
      setData: vi.fn(),
    };
    const dragStart = { dataTransfer, target: source } as unknown as DragEvent;
    const instance = $(root()).star("instance")!;
    const nonHtmlActionElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(source).toBeInstanceOf(HTMLElement);
    expect(nonHtmlActionElement).not.toBeInstanceOf(HTMLElement);
    expect(dragStart.target).toBe(source);
    await instance.run("projectBrowser.columnDragStart", {
      element: nonHtmlActionElement,
      event: dragStart,
    });
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "updated");

    const preventDefault = vi.fn();
    const dragOver = {
      dataTransfer,
      preventDefault,
      target,
    } as unknown as DragEvent;
    await instance.run("projectBrowser.columnDragOver", { element: target, event: dragOver });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(dataTransfer.dropEffect).toBe("move");

    const drop = { target } as unknown as DragEvent;
    await instance.run("projectBrowser.columnDrop", { element: target, event: drop });
    expect(
      Array.from(root().querySelectorAll<HTMLTableCellElement>("thead [data-column]"), (cell) =>
        cell.getAttribute("data-column"),
      ),
    ).toEqual(["name", "updated", "owner", "status"]);
  });

  it("expands durable details and saves an inline edit before reloading the row", async () => {
    root()
      .querySelector<HTMLButtonElement>('[data-project-browser-expand][data-project-id="jqstar"]')!
      .click();
    await vi.waitFor(() =>
      expect(
        root().querySelector<HTMLTableRowElement>('[data-project-browser-details="jqstar"]')
          ?.hidden,
      ).toBe(false),
    );
    const form = root().querySelector<HTMLFormElement>('[data-project-browser-edit="jqstar"]')!;
    form.querySelector<HTMLInputElement>('input[name="name"]')!.value = "jQuery Star edited";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(edits).toHaveLength(1));
    expect(edits[0]).toEqual({
      name: "jQuery Star edited",
      owner: "Platform",
      status: "planning",
      version: 1,
    });
    await vi.waitFor(() =>
      expect($('[data-text="$projectBrowserMessage"]').text()).toContain(
        "jQuery Star edited saved at version 2",
      ),
    );
    expect(requests).toHaveLength(2);
  });

  it("reloads optimistic conflicts and reports non-conflict edit failures", async () => {
    root()
      .querySelector<HTMLButtonElement>('[data-project-browser-expand][data-project-id="jqstar"]')!
      .click();
    const form = await vi.waitFor(() => {
      const candidate = root().querySelector<HTMLFormElement>(
        '[data-project-browser-edit="jqstar"]',
      );
      expect(candidate).not.toBeNull();
      return candidate!;
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "The server has a newer project." }), {
        headers: { "Content-Type": "application/json" },
        status: 409,
      }),
    );
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain(
        "The server has a newer project.",
      ),
    );
    expect(document.activeElement).toBe(
      root().querySelector('[data-project-browser-edit="jqstar"] input[name="name"]'),
    );
    expect(requests).toHaveLength(2);

    const refreshedForm = root().querySelector<HTMLFormElement>(
      '[data-project-browser-edit="jqstar"]',
    )!;
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("{}", { headers: { "Content-Type": "application/json" }, status: 500 }),
    );
    refreshedForm.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain(
        "Project update failed with 500.",
      ),
    );
  });

  it("fails explicitly when required composed components are missing", async () => {
    root().querySelector('[data-part="viewport"]')!.remove();
    await expect($(root()).star("instance")!.run("projectBrowser.refresh")).rejects.toThrow(
      "Project Browser needs Data Table, viewport, and Pagination.",
    );
  });

  it("reapplies column visibility after server rows are replaced", async () => {
    const ownerToggle = root().querySelector<HTMLInputElement>('[data-column-toggle="owner"]')!;
    ownerToggle.checked = false;
    ownerToggle.dispatchEvent(new Event("change", { bubbles: true }));
    expect(root().querySelector<HTMLElement>('th[data-column="owner"]')?.hidden).toBe(true);

    $('[data-on\\:click="@projectBrowser.refresh"]').trigger("click");
    await vi.waitFor(() =>
      expect(root().querySelector('[data-row-id="jqstar"] th')?.textContent).toContain(
        "jqstar refreshed",
      ),
    );
    expect(root().querySelector<HTMLElement>('td[data-column="owner"]')?.hidden).toBe(true);

    ownerToggle.checked = true;
    ownerToggle.dispatchEvent(new Event("change", { bubbles: true }));
    expect(root().querySelector<HTMLElement>('th[data-column="owner"]')?.hidden).toBe(false);
    expect(root().querySelector<HTMLElement>('td[data-column="owner"]')?.hidden).toBe(false);
  });

  it("announces loading while a Datastar request is in flight", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    $('[data-on\\:click="@projectBrowser.refresh"]').trigger("click");

    await vi.waitFor(() =>
      expect(root().querySelector("#project-browser-table")?.getAttribute("aria-busy")).toBe(
        "true",
      ),
    );
    expect(root().querySelector('[role="status"]')?.textContent).toContain("Updating results");

    resolveRequest(responseFor(requestSignals()));
    await vi.waitFor(() =>
      expect(root().querySelector("#project-browser-table")?.hasAttribute("aria-busy")).toBe(false),
    );
  });

  it("announces a backend failure without replacing the current rows", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Project service unavailable"));
    $('[data-on\\:click="@projectBrowser.refresh"]').trigger("click");

    await vi.waitFor(() =>
      expect(root().querySelector<HTMLElement>('[role="alert"]')?.textContent).toContain(
        "Project service unavailable",
      ),
    );
    expect(root().querySelector('[data-row-id="jqstar"]')).not.toBeNull();
  });

  it("keeps stable Data Table selection through a server row replacement", async () => {
    const selected = root().querySelector<HTMLInputElement>(
      '[data-row-id="jqstar"] [data-part="row-select"]',
    )!;
    selected.checked = true;
    selected.dispatchEvent(new Event("change", { bubbles: true }));

    $('[data-on\\:click="@projectBrowser.refresh"]').trigger("click");

    await vi.waitFor(() =>
      expect(root().querySelector('[data-row-id="jqstar"] th')?.textContent).toContain(
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

import { createServer, request as requestHttp, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProofApi } from "../server/api";
import type { ProjectStore } from "../server/project-store";

async function patchWithin(
  input: string,
  body: Record<string, unknown>,
): Promise<{ json(): Promise<unknown>; status: number }> {
  return new Promise((resolve, reject) => {
    const request = requestHttp(
      input,
      { method: "PATCH", headers: { "Content-Type": "application/json" } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const source = Buffer.concat(chunks).toString("utf8");
          resolve({
            json: async () => JSON.parse(source) as unknown,
            status: response.statusCode ?? 0,
          });
        });
      },
    );
    request.setTimeout(500, () => request.destroy(new Error(`Request did not finish: ${input}`)));
    request.on("error", reject);
    request.end(JSON.stringify(body));
  });
}

describe("self-hosted proof API", () => {
  let api: ReturnType<typeof createProofApi>;
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    api = createProofApi({ environment: "test", maxBodyBytes: 512 });
    server = createServer((request, response) => {
      void api.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    api.close();
  });

  it("reports deployable service health", async () => {
    const response = await fetch(`${origin}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      components: 102,
      database: "ready",
      environment: "test",
      projects: 2500,
      service: "jqstar",
      status: "healthy",
    });
  });

  it("increments operations revisions without client-owned state", async () => {
    const first = await (await fetch(`${origin}/api/demo/operations`)).json();
    const second = await (await fetch(`${origin}/api/demo/operations`)).json();
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(second.requests).toBeGreaterThan(first.requests);
    expect(second.release).toBe("v0.6.0-test");
  });

  it("returns a structured runtime snapshot for the control plane", async () => {
    const response = await fetch(`${origin}/api/demo/runtime`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      components: 102,
      connection: "connected",
      environment: "test",
      region: "us-central",
      revision: 1,
      runtime: {
        process: "node-http",
        registry: "source-owned",
        transport: "datastar-sse",
      },
      service: "jqstar",
    });
    expect(body.logs).toHaveLength(3);
    expect(new Date(body.nextCheck).valueOf()).toBeGreaterThan(new Date(body.timestamp).valueOf());
  });

  it("streams escaped log elements and completion signals through the Datastar SDK", async () => {
    const signals = encodeURIComponent(JSON.stringify({ controlPlaneMessage: "Ready" }));
    const response = await fetch(`${origin}/api/demo/runtime/stream?datastar=${signals}`);
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body.match(/event: datastar-patch-elements/g)).toHaveLength(3);
    expect(body).toContain("selector #runtime-log-entries");
    expect(body).toContain('data-level="warn"');
    expect(body).toContain("jQuery Star enhanced the server-appended entry.");
    expect(body).toContain("event: datastar-patch-signals");
    expect(body).toContain("appended 3 log entries");
  });

  it("filters and paginates the shared feed contract", async () => {
    const response = await fetch(`${origin}/api/demo/feed?query=official%20sdk&cursor=0`);
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.items[0].value).toBe("datastar");
    expect(body.done).toBe(true);
  });

  it("patches filtered project rows and Pagination through the Datastar SDK", async () => {
    const signals = encodeURIComponent(
      JSON.stringify({
        projectBrowserDirection: "ascending",
        projectBrowserOwner: "all",
        projectBrowserPage: 2,
        projectBrowserPageSize: 5,
        projectBrowserQuery: "",
        projectBrowserSort: "name",
        projectBrowserStatus: "all",
      }),
    );
    const response = await fetch(`${origin}/api/demo/projects?datastar=${signals}`);
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("event: datastar-patch-signals");
    expect(body.match(/event: datastar-patch-elements/g)).toHaveLength(2);
    expect(body).toContain("selector #project-browser-rows");
    expect(body).toContain('data-row-id="deployment-kit"');
    expect(body).not.toContain('data-row-id="accessibility-lab"');
    expect(body).toContain("selector #project-browser-pagination");
    expect(body).toContain('data-page="2" data-page-count="500"');
    expect(body).toContain('data-page="2" href="?page=2" aria-current="page"');
    expect(body).toContain('"projectBrowserRangeStart":6');
    expect(body).toContain('"projectBrowserRangeEnd":10');
  });

  it("renders exact project edit controls and middle-page navigation", async () => {
    const rowSignals = encodeURIComponent(
      JSON.stringify({
        projectBrowserPageSize: 5,
        projectBrowserQuery: "Datastar Bridge",
      }),
    );
    const rowBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${rowSignals}`)
    ).text();
    const revision = /id: project-browser-(\d+)-signals/.exec(rowBody)?.[1];
    expect(revision).toBeDefined();
    expect(rowBody).toContain(`id: project-browser-${revision}-rows`);
    expect(rowBody).toContain(`id: project-browser-${revision}-pagination`);
    expect(rowBody).toContain(
      'aria-controls="project-browser-details-datastar-bridge"><span aria-hidden="true">›</span><span class="sr-only">Show details for </span>Datastar Bridge</button>',
    );
    expect(rowBody).toContain(
      '<tr id="project-browser-details-datastar-bridge" data-project-browser-details="datastar-bridge" data-project-version="1" hidden>',
    );
    const editForm = /<form data-project-browser-edit="datastar-bridge".*?<\/form>/.exec(
      rowBody,
    )?.[0];
    expect(editForm).toBeDefined();
    expect(editForm).toContain(
      '<select name="owner" required><option value="Data">Data</option><option value="Design Systems">Design Systems</option><option value="Developer Experience">Developer Experience</option><option value="Operations">Operations</option><option value="Platform">Platform</option><option value="Quality">Quality</option><option value="Runtime" selected>Runtime</option><option value="Security">Security</option></select>',
    );
    expect(editForm?.match(/ selected/g)).toHaveLength(2);
    expect(editForm).toContain(
      '<select name="status" required><option value="active" selected>Active</option><option value="planning">Planning</option><option value="paused">Paused</option></select>',
    );
    expect(rowBody).toContain('"projectBrowserActiveFilters":1');
    const singlePage = /<nav id="project-browser-pagination".*?<\/nav>/.exec(rowBody)?.[0];
    expect(singlePage).toBe(
      '<nav id="project-browser-pagination" data-jqs="pagination" data-navigation="manual" data-page="1" data-page-count="1" data-on:jquery-star:pagination:change="@projectBrowser.page" aria-label="Project results pages"><ul><li><a data-part="previous" href="?page=1" aria-disabled="true">Previous</a></li><li><a data-part="page" data-page="1" href="?page=1" aria-current="page">1</a></li><li><a data-part="next" href="?page=1" aria-disabled="true">Next</a></li></ul><p data-part="status" aria-live="polite">Page 1 of 1</p></nav>',
    );

    const pageSignals = encodeURIComponent(
      JSON.stringify({
        projectBrowserPage: 250,
        projectBrowserPageSize: 5,
        projectBrowserWindowStart: 120,
      }),
    );
    const pageBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${pageSignals}`)
    ).text();
    const pagination = /<nav id="project-browser-pagination".*?<\/nav>/.exec(pageBody)?.[0];
    expect(pagination).toBe(
      '<nav id="project-browser-pagination" data-jqs="pagination" data-navigation="manual" data-page="250" data-page-count="500" data-on:jquery-star:pagination:change="@projectBrowser.page" aria-label="Project results pages"><ul><li><a data-part="previous" href="?page=249">Previous</a></li><li><a data-part="page" data-page="1" href="?page=1">1</a></li><li><span data-part="ellipsis" aria-hidden="true">…</span></li><li><a data-part="page" data-page="248" href="?page=248">248</a></li><li><a data-part="page" data-page="249" href="?page=249">249</a></li><li><a data-part="page" data-page="250" href="?page=250" aria-current="page">250</a></li><li><a data-part="page" data-page="251" href="?page=251">251</a></li><li><a data-part="page" data-page="252" href="?page=252">252</a></li><li><span data-part="ellipsis" aria-hidden="true">…</span></li><li><a data-part="page" data-page="500" href="?page=500">500</a></li><li><a data-part="next" href="?page=251">Next</a></li></ul><p data-part="status" aria-live="polite">Page 250 of 500</p></nav>',
    );
    expect(pageBody).not.toContain("data-project-browser-spacer");
  });

  it("applies project facets, description search, page size, and allowlist normalization", async () => {
    const signals = encodeURIComponent(
      JSON.stringify({
        projectBrowserDirection: "ascending",
        projectBrowserOwner: "Runtime",
        projectBrowserPage: 1,
        projectBrowserPageSize: 10,
        projectBrowserQuery: " Datastar Bridge ",
        projectBrowserSort: "name",
        projectBrowserStatus: "active",
      }),
    );
    const response = await fetch(`${origin}/api/demo/projects?datastar=${signals}`);
    const body = await response.text();
    expect(body).toContain('data-row-id="datastar-bridge"');
    expect(body).not.toContain('data-row-id="event-contracts"');
    expect(body).toContain('"projectBrowserCount":1');
    expect(body).toContain('"projectBrowserActiveFilters":3');
    expect(body).toContain("Showing 1–1 of 1 matching projects.");
    expect(body).toContain('"projectBrowserPageSize":10');

    const invalid = encodeURIComponent(
      JSON.stringify({
        projectBrowserGroupBy: "owner",
        projectBrowserMode: "invalid",
        projectBrowserOwner: "Unknown",
        projectBrowserPage: -7.8,
        projectBrowserPageSize: 999,
        projectBrowserStatus: "deleted",
        projectBrowserWindowSize: 1,
        projectBrowserWindowStart: -8.4,
      }),
    );
    const normalized = await (
      await fetch(`${origin}/api/demo/projects?datastar=${invalid}`)
    ).text();
    expect(normalized).toContain('"projectBrowserOwner":"all"');
    expect(normalized).toContain('"projectBrowserStatus":"all"');
    expect(normalized).toContain('"projectBrowserPageSize":5');
    expect(normalized).toContain('"projectBrowserGroupBy":"owner"');
    expect(normalized).toContain('"projectBrowserMode":"page"');
    expect(normalized).toContain('"projectBrowserPage":1');
    expect(normalized).toContain('"projectBrowserWindowSize":20');
    expect(normalized).toContain('"projectBrowserWindowStart":0');
    expect(normalized).toContain('"projectBrowserActiveFilters":0');

    const twenty = encodeURIComponent(JSON.stringify({ projectBrowserPageSize: 20 }));
    const twentyRows = await (await fetch(`${origin}/api/demo/projects?datastar=${twenty}`)).text();
    expect(twentyRows.match(/data-row-id=/g)).toHaveLength(20);

    const empty = encodeURIComponent(JSON.stringify({ projectBrowserQuery: "not-a-real-project" }));
    const emptyBody = await (await fetch(`${origin}/api/demo/projects?datastar=${empty}`)).text();
    expect(emptyBody).toContain('data-part="empty"');
    expect(emptyBody).toContain('"projectBrowserCount":0');
    expect(emptyBody).toContain('"projectBrowserRangeStart":0');
    expect(emptyBody).toContain('"projectBrowserRangeEnd":0');
    expect(emptyBody).toContain("No projects match the current query.");
    expect(emptyBody).toContain("No projects match the current search and filters.");
    expect(emptyBody).not.toContain("data-project-browser-spacer");
  });

  it("sorts every project data column in both directions and restores source order", async () => {
    const cases = [
      ["name", "ascending"],
      ["name", "descending"],
      ["owner", "ascending"],
      ["owner", "descending"],
      ["status", "ascending"],
      ["status", "descending"],
      ["updated", "ascending"],
      ["updated", "descending"],
    ] as const;

    for (const [sort, direction] of cases) {
      const signals = encodeURIComponent(
        JSON.stringify({
          projectBrowserDirection: direction,
          projectBrowserPageSize: 5,
          projectBrowserSort: sort,
        }),
      );
      const body = await (await fetch(`${origin}/api/demo/projects?datastar=${signals}`)).text();
      const rows = [...body.matchAll(/<tr data-row-id="[^"]+".*?<\/tr>/g)].map((match) => match[0]);
      const values = rows.map((row) => {
        if (sort === "name") {
          return /<span class="sr-only">Show details for <\/span>([^<]+)/.exec(row)?.[1] ?? "";
        }
        if (sort === "owner") {
          return /data-key="owner" data-column="owner">([^<]+)/.exec(row)?.[1] ?? "";
        }
        return new RegExp(`data-key="${sort}"[^>]*data-value="([^"]+)"`).exec(row)?.[1] ?? "";
      });
      const expected = [...values].sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }),
      );
      if (direction === "descending") expected.reverse();
      expect(values, `${sort} ${direction}`).toEqual(expected);
    }

    const sourceOrder = encodeURIComponent(
      JSON.stringify({ projectBrowserDirection: "none", projectBrowserSort: "name" }),
    );
    const sourceBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${sourceOrder}`)
    ).text();
    expect(/data-row-id="([^"]+)"/.exec(sourceBody)?.[1]).toBe("jqstar");
    expect(sourceBody).toContain('"projectBrowserDirection":"none"');
    expect(sourceBody).toContain('"projectBrowserSort":""');
    expect(sourceBody).toContain('"projectBrowserSorts":[]');

    const defaults = encodeURIComponent(JSON.stringify({}));
    const defaultsBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${defaults}`)
    ).text();
    expect(defaultsBody).toContain(
      '"projectBrowserSorts":[{"direction":"ascending","key":"name"}]',
    );
    expect(defaultsBody).toContain('"projectBrowserDirection":"ascending"');
    expect(defaultsBody).toContain('"projectBrowserSort":"name"');

    const malformedSorts = encodeURIComponent(
      JSON.stringify({
        projectBrowserDirection: "invalid",
        projectBrowserSort: "invalid",
        projectBrowserSorts: [
          null,
          [],
          7,
          "invalid",
          {},
          { direction: "descending", key: "owner" },
          { direction: "ascending", key: "owner" },
        ],
      }),
    );
    const malformedSortsBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${malformedSorts}`)
    ).text();
    expect(malformedSortsBody).toContain(
      '"projectBrowserSorts":[{"direction":"descending","key":"owner"}]',
    );
    expect(malformedSortsBody).toContain('"projectBrowserDirection":"descending"');
    expect(malformedSortsBody).toContain('"projectBrowserSort":"owner"');
  });

  it("normalizes ordered multi-sort, grouping, and bounded virtual windows", async () => {
    const grouped = encodeURIComponent(
      JSON.stringify({
        projectBrowserGroupBy: "status",
        projectBrowserPageSize: 20,
        projectBrowserSorts: [
          { direction: "ascending", key: "status" },
          { direction: "descending", key: "updated" },
          { direction: "descending", key: "updated" },
          { direction: "ascending", key: "DROP TABLE projects" },
        ],
      }),
    );
    const groupedBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${grouped}`)
    ).text();
    expect(groupedBody).toContain('data-project-browser-group="active"');
    expect(groupedBody).toContain('"projectBrowserGroupBy":"status"');
    expect(groupedBody).toContain(
      '"projectBrowserSorts":[{"direction":"ascending","key":"status"},{"direction":"descending","key":"updated"}]',
    );
    expect(groupedBody).not.toContain("DROP TABLE");
    expect(groupedBody.match(/data-row-id=/g)).toHaveLength(20);
    expect(groupedBody.match(/data-project-browser-group=/g)).toHaveLength(1);
    expect(groupedBody).toContain(
      '<tr data-project-browser-group="active"><th colspan="5" scope="rowgroup"><button data-project-browser-group-toggle="active" data-on:click="@projectBrowser.groupToggle" type="button" aria-expanded="true"><span aria-hidden="true">⌄</span>active <span>841 projects</span></button></th></tr>',
    );
    expect(groupedBody).not.toMatch(/<\/tr>[^<\n]+<tr/u);

    const virtual = encodeURIComponent(
      JSON.stringify({
        projectBrowserMode: "virtual",
        projectBrowserGroupBy: "owner",
        projectBrowserRequestId: 17,
        projectBrowserWindowSize: 999,
        projectBrowserWindowStart: 120,
      }),
    );
    const virtualBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${virtual}`)
    ).text();
    expect(virtualBody.match(/data-row-id=/g)).toHaveLength(80);
    expect(virtualBody).toContain('data-project-browser-spacer="top"');
    expect(virtualBody).toContain('data-project-browser-spacer="bottom"');
    expect(virtualBody).toContain('<nav hidden id="project-browser-pagination"');
    expect(virtualBody).toContain('"projectBrowserRequestId":17');
    expect(virtualBody).toContain('"projectBrowserWindowSize":80');
    expect(virtualBody).toContain('"projectBrowserWindowStart":120');
    expect(virtualBody).toContain('"projectBrowserGroupBy":"none"');
    expect(virtualBody).toContain(
      'data-project-browser-spacer="top" aria-hidden="true" style="height:6240px"',
    );
    expect(virtualBody).toContain(
      'data-project-browser-spacer="bottom" aria-hidden="true" style="height:119600px"',
    );
    expect(virtualBody).toContain('"projectBrowserRangeStart":121');
    expect(virtualBody).toContain('"projectBrowserRangeEnd":200');

    const firstWindow = encodeURIComponent(
      JSON.stringify({
        projectBrowserMode: "virtual",
        projectBrowserWindowSize: 80,
        projectBrowserWindowStart: 0,
      }),
    );
    const firstWindowBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${firstWindow}`)
    ).text();
    expect(firstWindowBody.match(/data-row-id=/g)).toHaveLength(80);
    expect(firstWindowBody).not.toContain('data-project-browser-spacer="top"');
    expect(firstWindowBody).toContain(
      'data-project-browser-spacer="bottom" aria-hidden="true" style="height:125840px"',
    );
    expect(firstWindowBody).toContain('"projectBrowserRangeStart":1');
    expect(firstWindowBody).toContain('"projectBrowserRangeEnd":80');

    const finalWindow = encodeURIComponent(
      JSON.stringify({
        projectBrowserDirection: "none",
        projectBrowserMode: "virtual",
        projectBrowserSort: "name",
        projectBrowserWindowSize: 80,
        projectBrowserWindowStart: 9999,
      }),
    );
    const finalWindowBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${finalWindow}`)
    ).text();
    expect(finalWindowBody.match(/data-row-id=/g)).toHaveLength(80);
    expect(finalWindowBody).toContain('data-row-id="project-2391"');
    expect(finalWindowBody).toContain('data-row-id="project-2470"');
    expect(finalWindowBody).toContain(
      'data-project-browser-spacer="top" aria-hidden="true" style="height:125840px"',
    );
    expect(finalWindowBody).not.toContain('data-project-browser-spacer="bottom"');
    expect(finalWindowBody).toContain('"projectBrowserWindowStart":2420');
    expect(finalWindowBody).toContain('"projectBrowserRangeStart":2421');
    expect(finalWindowBody).toContain('"projectBrowserRangeEnd":2500');

    const beyondLastPage = encodeURIComponent(
      JSON.stringify({
        projectBrowserDirection: "none",
        projectBrowserPage: 999,
        projectBrowserPageSize: 5,
        projectBrowserSort: "name",
      }),
    );
    const lastPageBody = await (
      await fetch(`${origin}/api/demo/projects?datastar=${beyondLastPage}`)
    ).text();
    expect(lastPageBody).toContain('data-page="500" data-page-count="500"');
    expect(lastPageBody).toContain('"projectBrowserPage":500');
    expect(lastPageBody).toContain('"projectBrowserRangeStart":2496');
    expect(lastPageBody).toContain('"projectBrowserRangeEnd":2500');
    expect(lastPageBody.match(/data-row-id=/g)).toHaveLength(5);
    expect(lastPageBody).toContain('data-row-id="project-2466"');
    expect(lastPageBody).toContain('data-row-id="project-2470"');
    expect(lastPageBody).not.toContain('data-page="501"');
    expect(lastPageBody).not.toContain('data-page="502"');
  });

  it("uses page and virtual offsets without redundant store relists", async () => {
    const current = {
      description: "Observed list query.",
      id: "observed",
      name: "Observed",
      owner: "Platform",
      status: "active" as const,
      updated: "2026-08-30",
      version: 1,
    };
    const listQueries: Array<Parameters<ProjectStore["list"]>[0]> = [];
    const observedStore: ProjectStore = {
      close() {},
      get: () => current,
      list(query) {
        listQueries.push({ ...query, sorts: [...query.sorts] });
        return { groups: [], items: [current], total: 100 };
      },
      owners: () => ["Platform"],
      update: () => ({ project: current, status: "updated" }),
    };
    const observedApi = createProofApi({ environment: "test", projectStore: observedStore });
    const observedServer = createServer((request, response) => {
      void observedApi.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => observedServer.listen(0, "127.0.0.1", resolve));
    const observedOrigin = `http://127.0.0.1:${(observedServer.address() as AddressInfo).port}`;
    const run = async (signals: Record<string, unknown>) => {
      listQueries.length = 0;
      const encoded = encodeURIComponent(JSON.stringify(signals));
      const response = await fetch(`${observedOrigin}/api/demo/projects?datastar=${encoded}`);
      expect(response.status).toBe(200);
      await response.text();
      return listQueries.map(({ groupBy, limit, offset }) => ({ groupBy, limit, offset }));
    };
    try {
      await expect(
        run({ projectBrowserGroupBy: "owner", projectBrowserPage: 2, projectBrowserPageSize: 5 }),
      ).resolves.toEqual([{ groupBy: "owner", limit: 5, offset: 5 }]);
      await expect(
        run({
          projectBrowserGroupBy: "owner",
          projectBrowserMode: "virtual",
          projectBrowserWindowSize: 40,
          projectBrowserWindowStart: 20,
        }),
      ).resolves.toEqual([{ groupBy: "none", limit: 40, offset: 20 }]);
      await expect(run({ projectBrowserPage: 999, projectBrowserPageSize: 5 })).resolves.toEqual([
        { groupBy: "none", limit: 5, offset: 4_990 },
        { groupBy: "none", limit: 5, offset: 95 },
      ]);
      await expect(
        run({
          projectBrowserMode: "virtual",
          projectBrowserWindowSize: 40,
          projectBrowserWindowStart: 9_999,
        }),
      ).resolves.toEqual([
        { groupBy: "none", limit: 40, offset: 9_999 },
        { groupBy: "none", limit: 40, offset: 60 },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        observedServer.close((error) => (error ? reject(error) : resolve())),
      );
      observedApi.close();
    }
  });

  it("keeps project mutation routing on the exact PATCH resource path", async () => {
    const wrongMethod = await fetch(`${origin}/api/demo/projects/jqstar`);
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("PATCH");
    expect(await wrongMethod.json()).toEqual({ error: "Method must be PATCH." });

    for (const pathname of [
      "/prefix/api/demo/projects/jqstar",
      "/api/demo/projects/jqstar/extra",
    ]) {
      const response = await fetch(`${origin}${pathname}`);
      expect(response.status, pathname).toBe(404);
      expect(await response.text(), pathname).toBe("");
    }
  });

  it("validates durable project edits and rejects optimistic-concurrency conflicts", async () => {
    const saved = await patchWithin(`${origin}/api/demo/projects/jqstar`, {
      name: " jQuery Star Production ",
      owner: "Platform",
      status: "active",
      version: 1,
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({
      message: "jQuery Star Production saved at version 2.",
      project: {
        description: "Reactive jQuery runtime and source-owned component system.",
        id: "jqstar",
        name: "jQuery Star Production",
        owner: "Platform",
        status: "active",
        updated: new Date().toISOString().slice(0, 10),
        version: 2,
      },
      status: "updated",
    });

    const conflict = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Stale overwrite",
        owner: "Runtime",
        status: "paused",
        version: 1,
      }),
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      error: "This project changed after the editor was opened. Reload it and try again.",
      project: {
        description: "Reactive jQuery runtime and source-owned component system.",
        id: "jqstar",
        name: "jQuery Star Production",
        owner: "Platform",
        status: "active",
        updated: new Date().toISOString().slice(0, 10),
        version: 2,
      },
      status: "conflict",
    });

    const invalid = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", owner: "Unknown", status: "deleted", version: 2 }),
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({
      error: "Project name must contain 1 to 120 characters.",
    });

    const nonStringName = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: null, owner: "Platform", status: "active", version: 2 }),
    });
    expect(nonStringName.status).toBe(422);
    expect(await nonStringName.json()).toEqual({
      error: "Project name must contain 1 to 120 characters.",
    });

    const tooLongName = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "x".repeat(121),
        owner: "Platform",
        status: "active",
        version: 2,
      }),
    });
    expect(tooLongName.status).toBe(422);
    expect(await tooLongName.json()).toEqual({
      error: "Project name must contain 1 to 120 characters.",
    });

    const wrongType = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Ignored" }),
    });
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toEqual({ error: "Content-Type must be application/json." });

    const malformed = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "Request body must contain valid JSON." });

    const emptyBody = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
    expect(emptyBody.status).toBe(400);
    expect(await emptyBody.json()).toEqual({ error: "Request body must contain valid JSON." });

    const nonObject = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "[]",
    });
    expect(nonObject.status).toBe(400);
    expect(await nonObject.json()).toEqual({ error: "Request body must be a JSON object." });

    for (const body of ["null", '"text"', "42"]) {
      const response = await fetch(`${origin}/api/demo/projects/jqstar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      expect(response.status, body).toBe(400);
      expect(await response.json(), body).toEqual({ error: "Request body must be a JSON object." });
    }

    const invalidOwner = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: "Unknown", status: "active", version: 2 }),
    });
    expect(invalidOwner.status).toBe(422);
    expect(await invalidOwner.json()).toEqual({ error: "Choose a known project owner." });

    const nonStringOwner = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: 12, status: "active", version: 2 }),
    });
    expect(nonStringOwner.status).toBe(422);
    expect(await nonStringOwner.json()).toEqual({ error: "Choose a known project owner." });

    const invalidStatus = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: "Platform", status: "deleted", version: 2 }),
    });
    expect(invalidStatus.status).toBe(422);
    expect(await invalidStatus.json()).toEqual({
      error: "Choose active, planning, or paused status.",
    });

    const nonStringStatus = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: "Platform", status: null, version: 2 }),
    });
    expect(nonStringStatus.status).toBe(422);
    expect(await nonStringStatus.json()).toEqual({
      error: "Choose active, planning, or paused status.",
    });

    const invalidVersion = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: "Platform", status: "active", version: 0 }),
    });
    expect(invalidVersion.status).toBe(422);
    expect(await invalidVersion.json()).toEqual({
      error: "Project version must be a positive integer.",
    });

    for (const version of [1.5, "invalid", null]) {
      const response = await fetch(`${origin}/api/demo/projects/jqstar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Valid", owner: "Platform", status: "active", version }),
      });
      expect(response.status, String(version)).toBe(422);
      expect(await response.json(), String(version)).toEqual({
        error: "Project version must be a positive integer.",
      });
    }

    const missing = await fetch(`${origin}/api/demo/projects/not-found`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid", owner: "Platform", status: "active", version: 1 }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Project was not found." });

    const malformedId = await fetch(`${origin}/api/demo/projects/%E0%A4%A`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(malformedId.status).toBe(400);
    expect(await malformedId.json()).toEqual({ error: "Project ID is invalid." });

    const minimumName = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", owner: "Platform", status: "active", version: 2 }),
    });
    expect(minimumName.status).toBe(200);
    expect(await minimumName.json()).toMatchObject({
      message: "x saved at version 3.",
      project: { name: "x", version: 3 },
      status: "updated",
    });

    const maximumName = await fetch(`${origin}/api/demo/projects/jqstar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "y".repeat(120),
        owner: "Platform",
        status: "active",
        version: 3,
      }),
    });
    expect(maximumName.status).toBe(200);
    expect(await maximumName.json()).toMatchObject({
      message: `${"y".repeat(120)} saved at version 4.`,
      project: { name: "y".repeat(120), version: 4 },
      status: "updated",
    });
  });

  it("handles a project disappearing between authorization and the atomic update", async () => {
    let injectedCloseCalls = 0;
    const current = {
      description: "Current project.",
      id: "vanishing",
      name: "Vanishing",
      owner: "Platform",
      status: "active" as const,
      updated: "2026-08-30",
      version: 1,
    };
    const disappearingStore: ProjectStore = {
      close() {
        injectedCloseCalls += 1;
      },
      get: () => current,
      list: () => ({ groups: [], items: [current], total: 1 }),
      owners: () => ["Platform"],
      update: () => ({ status: "missing" }),
    };
    const disappearingApi = createProofApi({
      environment: "test",
      projectStore: disappearingStore,
    });
    const disappearingServer = createServer((request, response) => {
      void disappearingApi.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => disappearingServer.listen(0, "127.0.0.1", resolve));
    const disappearingOrigin = `http://127.0.0.1:${
      (disappearingServer.address() as AddressInfo).port
    }`;
    try {
      const groupedSignals = encodeURIComponent(
        JSON.stringify({ projectBrowserGroupBy: "owner", projectBrowserSorts: [] }),
      );
      const grouped = await (
        await fetch(`${disappearingOrigin}/api/demo/projects?datastar=${groupedSignals}`)
      ).text();
      expect(grouped).toContain("Platform <span>0 projects</span>");

      const response = await fetch(`${disappearingOrigin}/api/demo/projects/vanishing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Still valid",
          owner: "Platform",
          status: "active",
          version: 1,
        }),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Project was not found." });
    } finally {
      await new Promise<void>((resolve, reject) =>
        disappearingServer.close((error) => (error ? reject(error) : resolve())),
      );
      disappearingApi.close();
      expect(injectedCloseCalls).toBe(0);
    }
  });

  it("owns configured seed storage and closes only its own database", async () => {
    const ownedApi = createProofApi({ environment: "test", projectSeedCount: 40 });
    const ownedServer = createServer((request, response) => {
      void ownedApi.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => ownedServer.listen(0, "127.0.0.1", resolve));
    const ownedOrigin = `http://127.0.0.1:${(ownedServer.address() as AddressInfo).port}`;
    try {
      const health = await fetch(`${ownedOrigin}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toMatchObject({ database: "ready", projects: 40 });

      ownedApi.close();
      const closed = await fetch(`${ownedOrigin}/health`);
      expect(closed.status).toBe(500);
      expect(await closed.json()).toEqual({ error: "Unexpected backend error." });
    } finally {
      await new Promise<void>((resolve, reject) =>
        ownedServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("lets the host deny project writes before storage mutation", async () => {
    let allow = false;
    const authorizationCalls: Array<{ currentName: string; updateName: string }> = [];
    const protectedApi = createProofApi({
      authorizeProjectWrite: (_request, current, update) => {
        authorizationCalls.push({ currentName: current.name, updateName: update.name });
        return allow;
      },
      environment: "test",
    });
    const protectedServer = createServer((request, response) => {
      void protectedApi.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => protectedServer.listen(0, "127.0.0.1", resolve));
    const protectedOrigin = `http://127.0.0.1:${(protectedServer.address() as AddressInfo).port}`;
    try {
      const denied = await fetch(`${protectedOrigin}/api/demo/projects/jqstar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Denied write",
          owner: "Platform",
          status: "active",
          version: 1,
        }),
      });
      expect(denied.status).toBe(403);
      expect(await denied.json()).toEqual({ error: "Project update is not allowed." });
      expect(authorizationCalls).toEqual([
        { currentName: "jQuery Star", updateName: "Denied write" },
      ]);
      const signals = encodeURIComponent(JSON.stringify({ projectBrowserQuery: "Denied write" }));
      const query = await (
        await fetch(`${protectedOrigin}/api/demo/projects?datastar=${signals}`)
      ).text();
      expect(query).toContain('"projectBrowserCount":0');

      allow = true;
      const allowed = await fetch(`${protectedOrigin}/api/demo/projects/jqstar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Allowed write",
          owner: "Platform",
          status: "active",
          version: 1,
        }),
      });
      expect(allowed.status).toBe(200);
      expect(await allowed.json()).toMatchObject({
        message: "Allowed write saved at version 2.",
        project: { name: "Allowed write", version: 2 },
        status: "updated",
      });
      expect(authorizationCalls).toEqual([
        { currentName: "jQuery Star", updateName: "Denied write" },
        { currentName: "jQuery Star", updateName: "Allowed write" },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        protectedServer.close((error) => (error ? reject(error) : resolve())),
      );
      protectedApi.close();
    }
  });

  it("patches JSON signals through the shared increment route", async () => {
    const response = await fetch(`${origin}/api/demo/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverCount: 7 }),
    });
    expect(await response.json()).toMatchObject({ serverCount: 17 });
  });

  it("loads and persists Access Manager assignments through Datastar patches", async () => {
    const loadedSignals = encodeURIComponent(
      JSON.stringify({ accessManagerMember: "luis", accessManagerPermissions: [] }),
    );
    const loaded = await fetch(`${origin}/api/demo/access?datastar=${loadedSignals}`);
    const loadedBody = await loaded.text();
    expect(loaded.headers.get("content-type")).toContain("text/event-stream");
    expect(loadedBody).toContain("selector #access-manager-permissions");
    expect(loadedBody).toContain("components:read");
    expect(loadedBody).toContain("audit:read");
    expect(loadedBody).toContain("Luis Ortiz access loaded from the backend");

    for (const permissions of [
      ["components:read", 7],
      ["components:read", "components:read"],
    ]) {
      const invalid = await fetch(`${origin}/api/demo/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessManagerMember: "luis",
          accessManagerPermissions: permissions,
        }),
      });
      expect(invalid.status, JSON.stringify(permissions)).toBe(422);
      expect(await invalid.json(), JSON.stringify(permissions)).toEqual({
        error: "Access permissions must be unique catalog values.",
      });
    }

    const saved = await fetch(`${origin}/api/demo/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessManagerMember: "luis",
        accessManagerPermissions: ["components:read"],
      }),
    });
    const savedBody = await saved.text();
    expect(saved.status).toBe(200);
    expect(savedBody).toContain("Luis Ortiz access saved at revision 2");
    expect(savedBody).toContain('data-value="[&quot;components:read&quot;]"');

    const reloaded = await fetch(`${origin}/api/demo/access?datastar=${loadedSignals}`);
    const reloadedBody = await reloaded.text();
    expect(reloadedBody).toContain("components:read");
    expect(reloadedBody).toContain('data-value="[&quot;components:read&quot;]"');

    const auditSignals = encodeURIComponent(
      JSON.stringify({ auditLogMember: "luis", auditLogPage: 1, auditLogQuery: "audit" }),
    );
    const audit = await fetch(`${origin}/api/demo/access/audit?datastar=${auditSignals}`);
    const auditBody = await audit.text();
    expect(audit.headers.get("content-type")).toContain("text/event-stream");
    expect(auditBody).toContain("selector #audit-log-rows");
    expect(auditBody).toContain("selector #audit-log-pagination");
    expect(auditBody).toContain('data-row-id="access-audit-4"');
    expect(auditBody).toContain("Removed Read audit log.");
    expect(auditBody).toContain("Luis Ortiz");

    const secondPageSignals = encodeURIComponent(
      JSON.stringify({ auditLogMember: "all", auditLogPage: 2, auditLogQuery: "" }),
    );
    const secondPage = await fetch(`${origin}/api/demo/access/audit?datastar=${secondPageSignals}`);
    const secondPageBody = await secondPage.text();
    expect(secondPageBody).toContain('data-row-id="access-audit-1"');
    expect(secondPageBody).toContain('data-page="2" data-page-count="2"');
    expect(secondPageBody).toContain('data-page="2" href="?audit-page=2" aria-current="page"');
  });

  it("saves validated profile settings and rotates server-owned invite URLs", async () => {
    const saved = await fetch(`${origin}/api/demo/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Grace Hopper", email: "grace@example.com" }),
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      displayName: "Grace Hopper",
      email: "grace@example.com",
      environment: "test",
      revision: 1,
    });

    const invalid = await fetch(`${origin}/api/demo/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "", email: "invalid" }),
    });
    expect(invalid.status).toBe(422);

    const invite = await fetch(`${origin}/api/demo/profile/invite`, { method: "POST" });
    expect(await invite.json()).toEqual({
      inviteUrl: "https://jqstar.dev/invite/test-1",
      revision: 1,
    });
  });

  it("streams Datastar SDK signal and element events", async () => {
    const signals = encodeURIComponent(JSON.stringify({ serverCount: 2 }));
    const response = await fetch(`${origin}/api/demo/stream?datastar=${signals}`);
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("event: datastar-patch-signals");
    expect(body).toContain('"serverCount":3');
    expect(body).toContain("event: datastar-patch-elements");
    expect(body).toContain("SDK-streamed HTML");
  });

  it("enforces methods and request body limits", async () => {
    const wrongMethod = await fetch(`${origin}/api/demo/operations`, { method: "POST" });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("GET");
    expect(await wrongMethod.json()).toEqual({ error: "Method must be GET." });
    const tooLarge = await fetch(`${origin}/api/demo/increment`, {
      method: "POST",
      body: "x".repeat(1_024),
    });
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: "Request body exceeds 512 bytes." });
  });
});

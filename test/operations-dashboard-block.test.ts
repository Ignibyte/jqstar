import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/operations-dashboard";

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/operations-dashboard.html"), "utf8");
});

describe("Operations Dashboard source block", () => {
  beforeEach(() => {
    document.body.innerHTML = blockHTML;
    $.star.ui.enhance(document);
    $('[data-block="operations-dashboard"]').star();
  });

  afterEach(() => {
    $('[data-block="operations-dashboard"]').star("destroy");
    vi.unstubAllGlobals();
  });

  it("applies a backend snapshot through the copied action module", async () => {
    const timestamp = new Date();
    const snapshot = {
      capacity: 73,
      components: 100,
      connection: "connected",
      environment: "test",
      logs: [
        {
          id: "block-log-1",
          level: "info",
          message: "The source block received its snapshot.",
          source: "test",
          timestamp: timestamp.toISOString(),
        },
      ],
      nextCheck: new Date(timestamp.valueOf() + 30_000).toISOString(),
      region: "test-central",
      revision: 7,
      runtime: {
        process: "node-http",
        registry: "source-owned",
        transport: "datastar-sse",
      },
      service: "jqstar",
      timestamp: timestamp.toISOString(),
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    $('[data-on\\:click="@operationsDashboard.refresh"]').trigger("click");

    await vi.waitFor(() => expect($('[data-dashboard-value="revision"]').text()).toBe("7"));
    expect(fetchMock).toHaveBeenCalledWith("/api/demo/runtime");
    expect($('[data-dashboard-value="components"]').text()).toBe("100");
    expect($('[data-dashboard-value="region"]').text()).toBe("test-central");
    expect($('[data-dashboard-part="capacity"]').attr("aria-valuenow")).toBe("73");
    expect($('[data-dashboard-part="logs"] [data-part="entry"]')).toHaveLength(1);
    expect($('[data-dashboard-part="logs"] [data-part="message"]').text()).toContain(
      "received its snapshot",
    );
    expect($.star.ui.jsonViewer.value('[data-dashboard-part="payload"]')).toMatchObject({
      revision: 7,
      service: "jqstar",
    });
    expect($('[data-text="$operationsDashboardMessage"]').text()).toBe(
      "Runtime snapshot revision 7 applied.",
    );
  });

  it("applies official Datastar SDK element patches through the copied stream action", async () => {
    const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
      stream.patchElements(
        '<li data-part="entry" data-level="warn" data-value="block-stream-1"><time data-part="timestamp">14:00:00</time><span data-part="level">WARN</span><span data-part="source">sse</span><span data-part="message">SDK stream reached the copied block.</span></li>',
        { mode: "append", selector: "#runtime-log-entries" },
      );
    });
    const fetchMock = vi.fn().mockResolvedValue(sdkResponse);
    vi.stubGlobal("fetch", fetchMock);

    $('[data-on\\:click="@operationsDashboard.stream"]').trigger("click");

    await vi.waitFor(() =>
      expect($('[data-dashboard-part="logs"] [data-part="entry"]')).toHaveLength(2),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/demo/runtime/stream?datastar=");
    expect($('[data-value="block-stream-1"] [data-part="message"]').text()).toBe(
      "SDK stream reached the copied block.",
    );
    expect($('[data-text="$operationsDashboardMessage"]').text()).toBe(
      "Datastar log stream completed.",
    );
  });
});

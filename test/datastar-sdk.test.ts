import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import type { StarInstance } from "../src/index";

interface SDKState extends Record<string, unknown> {
  count: number;
  removeMe?: string;
  _private: string;
}

function instance(): StarInstance<SDKState> {
  const application = $("#app").star<SDKState>("instance");
  if (!application) throw new Error("The SDK test application did not start.");
  return application;
}

async function settled(): Promise<void> {
  await $.star.nextUpdate();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("official Datastar TypeScript SDK compatibility", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main
        id="app"
        data-signals="{ count: 1, removeMe: 'delete me', _private: 'client only' }"
      >
        <section id="profile">Old profile</section>
        <ul id="feed"></ul>
        <div class="remove-by-selector">Remove by selector</div>
        <div id="remove-by-id">Remove by ID</div>
        <svg id="chart"></svg>
        <output data-text="$count"></output>
      </main>
    `;
  });

  afterEach(() => {
    $("body").children().star("destroy");
    $.star.clearExpressionCache();
    vi.unstubAllGlobals();
  });

  it("reads jQuery Star signals and applies events emitted by SDK 1.0", async () => {
    let requestSignals: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        const { signal: _signal, ...sdkInit } = init;
        const sdkRequest = new Request(url, sdkInit);
        const read = await ServerSentEventGenerator.readSignals(sdkRequest);
        if (!read.success) throw new Error(read.error);
        requestSignals = read.signals;

        return ServerSentEventGenerator.stream((stream) => {
          stream.patchSignals(
            JSON.stringify({
              count: 8,
              server: { source: "official-sdk" },
            }),
            { eventId: "signals", retryDuration: 2_000 },
          );
          stream.patchSignals(
            JSON.stringify({
              count: 99,
              defaultFromServer: true,
            }),
            { onlyIfMissing: true },
          );
          stream.patchElements(`
          <section id="profile">
            SDK profile
            <button class="sdk-button" data-on:click="$count++">Increment</button>
          </section>
        `);
          stream.patchElements(`<li class="sdk-item">Streamed by the SDK</li>`, {
            selector: "#feed",
            mode: "append",
          });
          stream.patchElements(`<circle id="sdk-point" cx="4" cy="4" r="2"></circle>`, {
            selector: "#chart",
            mode: "append",
            namespace: "svg",
          });
          stream.removeElements(".remove-by-selector");
          stream.patchElements(`<div id="remove-by-id"></div>`, { mode: "remove" });
          stream.removeSignals("removeMe");
        });
      }),
    );

    $("#app").star();
    await instance().run($.star.get("/sdk", { retry: "never" }));
    await settled();

    expect(requestSignals).toEqual({ count: 1, removeMe: "delete me" });
    expect(instance().state).toMatchObject({
      count: 8,
      defaultFromServer: true,
      server: { source: "official-sdk" },
    });
    expect(instance().state.removeMe).toBeUndefined();
    expect($("#profile").text()).toContain("SDK profile");
    expect($("#feed .sdk-item").text()).toBe("Streamed by the SDK");
    expect(document.querySelector("#sdk-point")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect($(".remove-by-selector, #remove-by-id")).toHaveLength(0);
    expect($("output").text()).toBe("8");

    $(".sdk-button").trigger("click");
    await settled();
    expect($("output").text()).toBe("9");
  });

  it("sends POST and DELETE signals in forms accepted by SDK readSignals", async () => {
    const requests: Array<{ method: string; signals: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        const { signal: _signal, ...sdkInit } = init;
        const sdkRequest = new Request(url, sdkInit);
        const read = await ServerSentEventGenerator.readSignals(sdkRequest);
        if (!read.success) throw new Error(read.error);
        requests.push({ method: sdkRequest.method, signals: read.signals });
        return new Response(null, { status: 204 });
      }),
    );

    $("#app").star();
    await instance().run($.star.post("/sdk", { retry: "never" }));
    await instance().run($.star.delete("/sdk", { retry: "never" }));

    expect(requests).toEqual([
      {
        method: "POST",
        signals: { count: 1, removeMe: "delete me" },
      },
      {
        method: "DELETE",
        signals: { count: 1, removeMe: "delete me" },
      },
    ]);
  });
});

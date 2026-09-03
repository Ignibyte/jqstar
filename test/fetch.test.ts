import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import type { FetchLifecycleDetail, StarContext, StarInstance } from "../src/index";

interface TestState extends Record<string, unknown> {
  count: number;
  loading: boolean;
  requestError: string | null;
}

function instance(): StarInstance<TestState> {
  const application = $("#app").star<TestState>("instance");
  if (!application) throw new Error("The test application did not start.");
  return application;
}

async function settled(): Promise<void> {
  await $.star.nextUpdate();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const source = JSON.stringify(body);
  return new Response(source, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(new TextEncoder().encode(source).byteLength),
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
}

describe("backend actions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    $("body").children().star("destroy");
    $.star.clearExpressionCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs @get from an attribute and patches public signals", async () => {
    document.body.innerHTML = `
      <section
        id="app"
        data-signals="{ count: 1, _secret: 'no', nested: { visible: 2, _local: 3 }, loading: false, requestError: 'old' }"
      >
        <button data-on:click="@get('/api/count', { pending: 'loading', error: 'requestError', params: { q: 'x' } })">
          Load
        </button>
        <output data-text="$count"></output>
      </section>
    `;
    const fetchMock = vi.fn(async () => jsonResponse({ count: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const lifecycle: FetchLifecycleDetail[] = [];
    $("button").on("datastar-fetch", (event) => {
      lifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });

    $("#app").star();
    $("button").trigger("click");
    await vi.waitFor(() => expect($("output").text()).toBe("2"));

    const [requestURL, requestInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestURL.pathname).toBe("/api/count");
    expect(requestURL.searchParams.get("q")).toBe("x");
    expect(JSON.parse(requestURL.searchParams.get("datastar") ?? "")).toEqual({
      count: 1,
      nested: { visible: 2 },
      loading: false,
      requestError: "old",
    });
    expect(new Headers(requestInit.headers).get("Datastar-Request")).toBe("true");
    expect(instance().state.loading).toBe(false);
    expect(instance().state.requestError).toBeNull();
    expect(lifecycle.map(({ type }) => type)).toEqual(["started", "progress", "finished"]);
  });

  it("posts JSON and morphs an HTML target without losing live directives", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 2, loading: false, requestError: null }">
        <div id="target"><span>Old</span></div>
      </section>
    `;
    const html = `
      <button class="inserted" data-on:click="$count++">Increment</button>
      <output data-text="$count"></output>
    `;
    const fetchMock = vi.fn(
      async () =>
        new Response(html, {
          headers: {
            "Content-Type": "text/html",
            "datastar-selector": "#target",
            "datastar-mode": "inner",
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    $("#app").star();
    const response = await instance().run(
      $.star.post<TestState>("/save", {
        payload: ({ state }: StarContext<TestState>) => ({ count: state.count, source: "test" }),
      }),
    );
    await $.star.whenEnhanced();

    expect(response).toBeInstanceOf(Response);
    const [requestURL, requestInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestURL.pathname).toBe("/save");
    expect(requestInit.method).toBe("POST");
    expect(new Headers(requestInit.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(requestInit.body))).toEqual({ count: 2, source: "test" });
    expect($("#target > #target")).toHaveLength(0);
    expect($("#target output").text()).toBe("2");

    $(".inserted").trigger("click");
    await settled();
    expect($("#target output").text()).toBe("3");
  });

  it("preserves request bytes and lifecycle ordering for every named backend action", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 3, _private: 'omit', loading: false, requestError: null }"></section>
    `;
    const requests: Array<[URL, RequestInit]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        requests.push([url, init]);
        return new Response(null, { status: 204 });
      }),
    );
    const datastarLifecycle: FetchLifecycleDetail[] = [];
    const jqueryStarLifecycle: FetchLifecycleDetail[] = [];

    $("#app").star();
    $("#app").on("datastar-fetch", (event) => {
      expect(event.target).toBe($("#app").get(0));
      datastarLifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });
    $("#app").on("jquery-star:fetch", (event) => {
      expect(event.target).toBe($("#app").get(0));
      jqueryStarLifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });

    const methods = [
      ["get", "GET"],
      ["post", "POST"],
      ["put", "PUT"],
      ["patch", "PATCH"],
      ["delete", "DELETE"],
    ] as const;
    for (const [action] of methods) {
      await instance().run(action, {
        args: [
          `/contract/${action}`,
          {
            credentials: "include",
            headers: { "X-Contract": action },
            payload: { count: 3, action },
          },
        ],
      });
    }

    expect(requests).toHaveLength(methods.length);
    for (const [[action, method], [url, init]] of methods.map((entry, index) => [
      entry,
      requests[index]!,
    ]) as Array<[(typeof methods)[number], [URL, RequestInit]]>) {
      const headers = new Headers(init.headers);
      expect(url.pathname).toBe(`/contract/${action}`);
      expect(init.method).toBe(method);
      expect(init.credentials).toBe("include");
      expect(headers.get("Datastar-Request")).toBe("true");
      expect(headers.get("Accept")).toBe("text/event-stream, text/html, application/json");
      expect(headers.get("X-Contract")).toBe(action);

      if (method === "GET") {
        expect(init.body).toBeUndefined();
        expect(JSON.parse(url.searchParams.get("datastar") ?? "")).toEqual({
          count: 3,
          action,
        });
      } else {
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(JSON.parse(String(init.body))).toEqual({ count: 3, action });
        expect(url.searchParams.has("datastar")).toBe(method === "DELETE");
      }
    }

    const expectedLifecycle = methods.flatMap(([, method]) => [
      `started:${method}`,
      `finished:${method}`,
    ]);
    expect(datastarLifecycle.map(({ type, method }) => `${type}:${method}`)).toEqual(
      expectedLifecycle,
    );
    expect(jqueryStarLifecycle).toEqual(datastarLifecycle);
  });

  it("submits URL-encoded and multipart form bodies without exposing either body to policy", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }">
        <form id="encoded"><input name="query" value="jquery star"></form>
        <form id="multipart" enctype="multipart/form-data"><input name="title" value="upload"></form>
      </section>
    `;
    const requests: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL, init: RequestInit) => {
        requests.push(init);
        return new Response(null, { status: 204 });
      }),
    );

    $("#app").star();
    await instance().run($.star.post("/encoded", { contentType: "form", selector: "#encoded" }));
    await instance().run(
      $.star.post("/multipart", { contentType: "form", selector: "#multipart" }),
    );

    expect(requests[0]?.body).toBeInstanceOf(URLSearchParams);
    expect(String(requests[0]?.body)).toBe("query=jquery+star");
    expect(new Headers(requests[0]?.headers).get("Content-Type")).toBe(
      "application/x-www-form-urlencoded;charset=UTF-8",
    );
    expect(requests[1]?.body).toBeInstanceOf(FormData);
    expect((requests[1]?.body as FormData).get("title")).toBe("upload");
    expect(new Headers(requests[1]?.headers).has("Content-Type")).toBe(false);
  });

  it("retries successful non-204 responses only when explicitly configured", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ count: 1 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    $("#app").star();
    await instance().run(
      $.star.get("/retry-completed", {
        retry: "always",
        retryInterval: 0,
        retryMaxCount: 1,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(instance().state.count).toBe(1);
  });

  it("applies Datastar signal and element patches from a chunked SSE stream", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }">
        <div id="feed"></div>
        <output data-text="$count"></output>
      </section>
    `;
    const chunks = [
      "event: datastar-patch-signals\r\ndata: signals {count: ",
      '5}\r\n\r\nevent: datastar-patch-elements\ndata: selector #feed\ndata: mode append\ndata: elements <button class="streamed" data-on:click="$count++">Again</button>\n\n',
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(stream, {
            headers: { "Content-Type": "text/event-stream" },
          }),
      ),
    );

    $("#app").star();
    await instance().run("get", { args: ["/stream"] });
    await $.star.whenEnhanced();

    expect(instance().state.count).toBe(5);
    expect($("#feed .streamed")).toHaveLength(1);
    expect($("output").text()).toBe("5");
    $(".streamed").trigger("click");
    await settled();
    expect($("output").text()).toBe("6");
  });

  it("forwards unknown SSE messages with their public event payload", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("event: application-notice\nid: event-7\ndata: ready\n\n", {
            headers: { "Content-Type": "text/event-stream" },
          }),
      ),
    );
    const messages: unknown[] = [];

    $("#app").star();
    $("#app").on("jquery-star:sse", (event) => {
      expect(event.target).toBe($("#app").get(0));
      messages.push((event as unknown as { detail: unknown }).detail);
    });
    await instance().run("get", { args: ["/events"] });

    expect(messages).toEqual([{ event: "application-notice", data: "ready", id: "event-7" }]);
  });

  it("cancels an older matching request when a newer request starts", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    let firstSignal: AbortSignal | undefined;
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        calls += 1;
        if (calls === 2) return Promise.resolve(jsonResponse({ count: 9 }));
        firstSignal = init.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          firstSignal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        });
      }),
    );

    $("#app").star();
    const first = instance().run($.star.get("/same"));
    await Promise.resolve();
    const second = instance().run($.star.get("/same"));

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeInstanceOf(Response);
    expect(firstSignal?.aborted).toBe(true);
    expect(instance().state.count).toBe(9);
  });

  it("retries network errors and reports the attempt lifecycle", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(jsonResponse({ count: 4 }));
    vi.stubGlobal("fetch", fetchMock);
    const lifecycle: FetchLifecycleDetail[] = [];

    $("#app").star();
    $("#app").on("jquery-star:fetch", (event) => {
      lifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });
    await instance().run(
      $.star.get("/retry", {
        retry: "auto",
        retryInterval: 0,
        retryMaxCount: 1,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(instance().state.count).toBe(4);
    expect(lifecycle.map(({ type, attempt }) => `${type}:${attempt}`)).toEqual([
      "started:1",
      "retrying:1",
      "started:2",
      "progress:2",
      "finished:2",
    ]);
  });

  it("records terminal HTTP errors and always clears pending state", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("No", {
            status: 500,
            statusText: "Broken",
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );
    const lifecycle: FetchLifecycleDetail[] = [];

    $("#app").star();
    $("#app").on("jquery-star:fetch", (event) => {
      lifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });
    await expect(
      instance().run(
        $.star.get("/failure", {
          pending: "loading",
          error: "requestError",
          retry: "never",
        }),
      ),
    ).rejects.toThrow("500 Broken");

    expect(instance().state.loading).toBe(false);
    expect(instance().state.requestError).toBe("Backend request failed with 500 Broken.");
    expect(lifecycle.map(({ type }) => type)).toEqual(["started", "retries-failed", "error"]);
  });

  it("submits valid forms and aborts open work when the application is destroyed", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }">
        <form>
          <input name="query" value="jquery">
          <button data-on:click__prevent="@get('/search', { contentType: 'form' })">Search</button>
        </form>
      </section>
    `;
    let signal: AbortSignal | undefined;
    let requestURL: URL | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: URL, init: RequestInit) => {
        requestURL = url;
        signal = init.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            {
              once: true,
            },
          );
        });
      }),
    );

    $("#app").star();
    $("button").trigger("click");
    await vi.waitFor(() => expect(requestURL).toBeDefined());
    expect(requestURL?.searchParams.get("query")).toBe("jquery");
    expect(requestURL?.searchParams.has("datastar")).toBe(false);

    $("#app").star("destroy");
    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it("aborts cleanup-mode work when its directive element is removed", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }">
        <button data-on:click="@get('/slow', { requestCancellation: 'cleanup' })">Load</button>
      </section>
    `;
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        signal = init.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            {
              once: true,
            },
          );
        });
      }),
    );

    $("#app").star();
    $("button").trigger("click");
    await vi.waitFor(() => expect(signal).toBeDefined());
    $("button").remove();
    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it("turns cancellation during retry backoff into a clean aborted finish", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0, loading: false, requestError: null }"></section>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    const lifecycle: FetchLifecycleDetail[] = [];

    $("#app").star();
    $("#app").on("jquery-star:fetch", (event) => {
      lifecycle.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
    });
    const request = instance().run(
      $.star.get("/retry-then-cancel", {
        retryInterval: 60_000,
      }),
    );
    await vi.waitFor(() => expect(lifecycle.some(({ type }) => type === "retrying")).toBe(true));
    $("#app").star("destroy");

    await expect(request).resolves.toBeUndefined();
    expect(lifecycle.at(-1)).toMatchObject({ type: "finished", aborted: true });
  });
});

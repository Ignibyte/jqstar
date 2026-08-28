import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProofApi } from "../server/api";

describe("self-hosted proof API", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    const api = createProofApi({ environment: "test", maxBodyBytes: 128 });
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
  });

  it("reports deployable service health", async () => {
    const response = await fetch(`${origin}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      components: 90,
      environment: "test",
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
    expect(second.release).toBe("v0.5.0-test");
  });

  it("filters and paginates the shared feed contract", async () => {
    const response = await fetch(`${origin}/api/demo/feed?query=official%20sdk&cursor=0`);
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.items[0].value).toBe("datastar");
    expect(body.done).toBe(true);
  });

  it("patches JSON signals through the shared increment route", async () => {
    const response = await fetch(`${origin}/api/demo/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverCount: 7 }),
    });
    expect(await response.json()).toMatchObject({ serverCount: 17 });
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
    const tooLarge = await fetch(`${origin}/api/demo/increment`, {
      method: "POST",
      body: "x".repeat(256),
    });
    expect(tooLarge.status).toBe(413);
  });
});

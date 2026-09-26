// @vitest-environment node
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProofApi } from "../server/api";

describe("proof route input and response contracts", () => {
  let api: ReturnType<typeof createProofApi>;
  let server: Server;
  let origin: string;

  beforeEach(async () => {
    api = createProofApi({ environment: "test", projectSeedCount: 4, maxBodyBytes: 512 });
    server = createServer((request, response) => {
      void api.handle(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing loopback address.");
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    } finally {
      api.close();
    }
  });

  it.each([
    ["/health", "GET"],
    ["/api/demo/operations", "GET"],
    ["/api/demo/runtime", "GET"],
    ["/api/demo/runtime/stream", "GET"],
    ["/api/demo/metrics", "GET"],
    ["/api/demo/feed", "GET"],
    ["/api/demo/projects", "GET"],
    ["/api/demo/increment", "POST"],
    ["/api/demo/access", "GET, POST"],
    ["/api/demo/access/audit", "GET"],
    ["/api/demo/profile", "POST"],
    ["/api/demo/profile/invite", "POST"],
    ["/api/demo/stream", "GET"],
    ["/api/demo/account", "POST"],
    ["/api/demo/autocomplete", "GET"],
  ])("rejects a disallowed method at %s and advertises %s", async (path, allowed) => {
    const response = await fetch(`${origin}${path}`, { method: "DELETE" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe(allowed);
    expect(await response.json()).toEqual({
      error: `Method must be ${allowed.replace(", ", " or ")}.`,
    });
  });

  it.each([
    "/api/demo/runtime/stream",
    "/api/demo/projects",
    "/api/demo/access",
    "/api/demo/access/audit",
    "/api/demo/stream",
    "/api/demo/autocomplete",
  ])("rejects malformed Datastar input before streaming at %s", async (path) => {
    const response = await fetch(`${origin}${path}?datastar=%7B`);
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body).not.toBe("");
    expect(body).not.toContain("event: datastar-");
  });

  it("advances both metric series on each server read", async () => {
    const first = await fetch(`${origin}/api/demo/metrics`);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      series: [
        [255, 333, 398, 445],
        [119, 225, 291, 354],
      ],
      message: "The test backend patched four table rows (revision 1).",
    });
    expect(await (await fetch(`${origin}/api/demo/metrics`)).json()).toMatchObject({
      series: [
        [262, 340, 405, 452],
        [126, 232, 298, 361],
      ],
      message: "The test backend patched four table rows (revision 2).",
    });
  });

  it.each(["taken@example.com", "available@example.com"])(
    "returns account validation for %s",
    async (email) => {
      const body = new FormData();
      body.set("email", email);
      const response = await fetch(`${origin}/api/demo/account`, { method: "POST", body });
      expect(response.status).toBe(email.startsWith("taken") ? 422 : 200);
      expect(await response.json()).toEqual(
        email.startsWith("taken")
          ? {
              errors: {
                _form: "The server rejected one field. Your file selection was left intact.",
                email: "That account already exists. Try another email.",
              },
            }
          : { message: "The test backend accepted the multipart form." },
      );
    },
  );

  it("streams matching autocomplete options and an explicit empty result", async () => {
    for (const [query, count] of [
      [" DaTaStAr ", 1],
      ["missing-system", 0],
    ] as const) {
      const signals = encodeURIComponent(JSON.stringify({ componentQuery: query }));
      const response = await fetch(`${origin}/api/demo/autocomplete?datastar=${signals}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      const body = await response.text();
      expect(body).toContain(`"componentResultCount":${count}`);
      expect(body).toContain("selector #technology-combobox-content");
      expect(body).toContain(
        count
          ? 'data-value="datastar">Datastar</div>'
          : '<div data-part="empty">No matching systems</div>',
      );
    }
  });

  it("rejects unknown members and records permission reordering without added or removed grants", async () => {
    const unknown = encodeURIComponent(JSON.stringify({ accessManagerMember: "missing-member" }));
    const rejected = await fetch(`${origin}/api/demo/access?datastar=${unknown}`);
    expect(rejected.status).toBe(422);
    expect(await rejected.json()).toEqual({ error: "Unknown access member." });
    for (const permissions of [
      ["components:read", "audit:read"],
      ["audit:read", "components:read"],
    ]) {
      const response = await fetch(`${origin}/api/demo/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessManagerMember: "maya",
          accessManagerPermissions: permissions,
        }),
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(JSON.stringify(permissions));
    }
    const signals = encodeURIComponent(
      JSON.stringify({ auditLogMember: "maya", auditLogQuery: "priority" }),
    );
    const body = await (await fetch(`${origin}/api/demo/access/audit?datastar=${signals}`)).text();
    expect(body).toContain('"auditLogCount":1');
    expect(body).toContain("Reordered");
    const empty = encodeURIComponent(
      JSON.stringify({ auditLogMember: "missing-member", auditLogQuery: "nonexistent-audit-text" }),
    );
    const emptyBody = await (
      await fetch(`${origin}/api/demo/access/audit?datastar=${empty}`)
    ).text();
    expect(emptyBody).toContain('"auditLogMember":"all"');
    expect(emptyBody).toContain('"auditLogCount":0');
    expect(emptyBody).toContain("No access events match these filters.");
  });
});

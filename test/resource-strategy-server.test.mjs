// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createResourceStrategyServer } from "./fixtures/resource-strategy/server.mjs";

const server = createResourceStrategyServer(".git/jqstar/resource-strategy/build");
let origin;
beforeAll(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function url(session, operation) {
  return `${origin}/resource-strategy/${session}/${operation}`;
}
async function control(session, value) {
  const response = await fetch(url(session, "control"), {
    method: "POST",
    body: JSON.stringify(value),
  });
  expect(response.status).toBe(200);
}
async function post(session, values, accept = "application/json") {
  return await fetch(url(session, "project/A"), {
    method: "POST",
    redirect: "manual",
    headers: { Accept: accept },
    body: new URLSearchParams({
      csrf: "inspector-fixture-csrf",
      version: "1",
      name: "Changed",
      returnTo: "server",
      ...values,
    }),
  });
}

describe("Project Inspector common server contract", () => {
  it("serves equivalent native initial HTML for every strategy", async () => {
    const documents = [];
    for (const strategy of ["server", "external", "native"]) {
      const response = await fetch(url("html", strategy));
      expect(response.status).toBe(200);
      const source = await response.text();
      expect(source.match(/ data-jqs/g)).toHaveLength(3);
      expect(source).toContain('method="post"');
      expect(source).toContain('name="version" value="1"');
      expect(source).toContain('role="status"');
      documents.push(
        source.replaceAll(`/${strategy}`, "/STRATEGY").replaceAll(`"${strategy}"`, '"STRATEGY"'),
      );
    }
    expect(documents[0]).toBe(documents[1]);
    expect(documents[1]).toBe(documents[2]);
  });

  it("negotiates SDK patches and JSON with representation-specific validators", async () => {
    await control("media", { delays: { A: 0 } });
    const json = await fetch(url("media", "project/A"), {
      headers: { Accept: "application/json" },
    });
    const project = await json.json();
    const patch = await fetch(url("media", "project/A"), {
      headers: { Accept: "text/event-stream" },
    });
    const stream = await patch.text();
    expect(project).toMatchObject({ id: "A", version: 1 });
    expect(stream).toContain('id="summary-content"');
    expect(stream).toContain('id="activity-content"');
    expect(stream).toContain('"resolvedVersion":1');
    expect(patch.headers.get("content-type")).toContain("text/event-stream");
    expect(patch.headers.get("vary")).toBe("Accept");
    expect(patch.headers.get("cache-control")).toBe("private, max-age=60");
    expect(patch.headers.get("etag")).not.toBe(json.headers.get("etag"));
    const conditional = await fetch(url("media", "project/A"), {
      headers: { Accept: "application/json", "If-None-Match": json.headers.get("etag") },
    });
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");
    expect(await (await fetch(url("media", "metrics"))).json()).toMatchObject({
      reads: 3,
      conditional: 1,
      active: 0,
    });
  });

  it("owns validation, CSRF, permission and version conflicts", async () => {
    expect((await post("writes", { csrf: "wrong" })).status).toBe(403);
    expect((await post("writes", { name: " " })).status).toBe(422);
    expect((await post("writes", { version: "0" })).status).toBe(409);
    const changed = await post("writes", {});
    expect(changed.status).toBe(200);
    expect(await changed.json()).toEqual({ message: "Project saved.", version: 2 });
    expect((await post("writes", {})).status).toBe(409);
    await control("writes", { forbidden: true });
    expect((await post("writes", { version: "2" })).status).toBe(403);
    expect(await (await fetch(url("writes", "metrics"))).json()).toMatchObject({
      writes: 1,
      conflicts: 2,
      invalid: 1,
      forbidden: 2,
    });
  });

  it("supports native redirect and escapes canonical values in HTML and seed data", async () => {
    const result = await post("native-form", { name: '<script>alert("x")</script>' }, "text/html");
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe("/resource-strategy/native-form/server?selected=A");
    const html = await (await fetch(new URL(result.headers.get("location"), origin))).text();
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("\\u003cscript>");
    expect(html).not.toContain('<script>alert("x")</script>');
  });

  it("isolates sessions and returns finite read failures without changing canonical data", async () => {
    await control("errors", { failures: { A: 1 }, delays: { A: 0 } });
    expect((await fetch(url("errors", "project/A"))).status).toBe(503);
    expect((await fetch(url("errors", "project/A"))).status).toBe(200);
    await post("errors", {});
    const other = await (await fetch(url("different-identity", "project/A"))).json();
    expect(other).toMatchObject({ name: "Project A", version: 1 });
  });
});

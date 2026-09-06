// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { createNavigationDecisionServer } from "./fixtures/navigation-decision/server.mjs";

const servers = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});
async function fixture() {
  const server = createNavigationDecisionServer(".git/jqstar/navigation-decision/assets");
  servers.push(server);
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  return `http://127.0.0.1:${server.address().port}/navigation`;
}
function edit({
  revision = 1,
  title = "Project",
  intent = "save",
  file = "navigation-file-proof",
} = {}) {
  const form = new FormData();
  form.set("revision", String(revision));
  form.set("title", title);
  form.set("attachment", new Blob([file]), "navigation-proof.txt");
  form.set("intent", intent);
  return form;
}

describe("fixed navigation server contracts", () => {
  it("returns identical ordinary HTML for every candidate and full region documents", async () => {
    const base = await fixture();
    for (const route of ["start", "guide", "private", "region", "region-mismatch"]) {
      const documents = [];
      for (const candidate of [
        "browser-nojs",
        "browser",
        "turbo-8.0.21",
        "turbo-8.0.23",
        "htmx-2.0.0",
        "htmx-2.0.10",
      ]) {
        const response = await fetch(`${base}/${route}`, {
          headers: { cookie: `jqs-nav-candidate=${candidate}` },
        });
        expect(response.status).toBe(200);
        if (route === "private")
          expect(response.headers.get("cache-control")).toBe("private, no-store");
        documents.push(await response.text());
      }
      expect(new Set(documents).size).toBe(1);
      expect(documents[0]).toContain("<!doctype html>");
      expect(documents[0]).toContain('<details id="disclosure"');
      expect(documents[0]).toContain('enctype="multipart/form-data"');
      if (route === "private") expect(documents[0]).toMatch(/<main[^>]+hx-history="false"/);
      if (route === "region-mismatch")
        expect(documents[0]).not.toContain('<turbo-frame id="activity"');
      else expect(documents[0]).toContain('<turbo-frame id="activity"');
    }
  });

  it("keeps multipart boundaries, preview, revision conflicts and validation authoritative", async () => {
    const base = await fixture();
    const post = async (options) =>
      fetch(`${base}/edit`, { method: "POST", body: edit(options), redirect: "manual" });
    expect((await post({ title: "invalid" })).status).toBe(422);
    expect((await post({ revision: 0 })).status).toBe(409);
    const preview = await post({ intent: "preview", file: 'name="intent"\r\n\r\nsave' });
    expect(preview.status).toBe(303);
    expect(preview.headers.get("location")).toBe("/navigation/preview");
    expect((await (await fetch(`${base}/metrics`)).json()).writes).toBe(0);
    const saved = await post({});
    expect(saved.status).toBe(303);
    expect(saved.headers.get("location")).toBe("/navigation/saved");
    const metrics = await (await fetch(`${base}/metrics`)).json();
    expect(metrics.writes).toBe(1);
    expect(metrics.revision).toBe(2);
    expect(metrics.requests.at(-1)).toMatchObject({
      multipart: true,
      bodyPresent: true,
      fileMatched: true,
      submitterMatched: true,
      disabledExcluded: true,
      revisionMatched: true,
    });
    expect(JSON.stringify(metrics)).not.toMatch(
      /navigation-file-proof|navigation-proof\.txt|name="intent"|Project/,
    );
  });

  it("records one committed write after losing its response, without server replay", async () => {
    const base = await fixture();
    const response = await fetch(`${base}/edit`, {
      method: "POST",
      body: edit({ intent: "lose" }),
    });
    expect(response.status).toBe(200);
    await expect(response.text()).rejects.toThrow();
    const metrics = await (await fetch(`${base}/metrics`)).json();
    expect(metrics.writes).toBe(1);
    expect(metrics.revision).toBe(2);
    expect(metrics.requests).toHaveLength(1);
    expect(metrics.requests[0]).toMatchObject({ method: "POST", aborted: true, status: 200 });
  });

  it("retains only approved lifecycle fields and isolates fixture sessions", async () => {
    const base = await fixture();
    await fetch(`${base}/events`, {
      method: "POST",
      headers: { cookie: "jqs-nav-session=one" },
      body: JSON.stringify({
        event: "document-disposed",
        failed: 0,
        remaining: 0,
        url: "secret-path",
        state: { token: "secret-token" },
        role: "secret-selector",
      }),
    });
    const first = await (
      await fetch(`${base}/metrics`, { headers: { cookie: "jqs-nav-session=one" } })
    ).json();
    const second = await (
      await fetch(`${base}/metrics`, { headers: { cookie: "jqs-nav-session=two" } })
    ).json();
    expect(first.events).toEqual([
      { event: "document-disposed", failed: 0, remaining: 0, serverSequence: 1 },
    ]);
    expect(second.events).toEqual([]);
    expect(JSON.stringify(first)).not.toContain("secret");
  });
});

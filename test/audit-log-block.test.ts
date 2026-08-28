import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/audit-log";

interface AuditSignals extends Record<string, unknown> {
  auditLogMember: string;
  auditLogPage: number;
  auditLogQuery: string;
}

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/audit-log.html"), "utf8");
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-block="audit-log"]')!;
}

function responseFor(member: string): Response {
  const name = member === "luis" ? "Luis Ortiz" : "Amina Yusuf";
  return ServerSentEventGenerator.stream((stream) => {
    stream.patchElements(
      `<tr data-row-id="access-audit-proof"><td data-key="timestamp"><time datetime="2026-08-28T15:24:00.000Z">Aug 28, 15:24 UTC</time><small>Current user</small></td><th scope="row" data-key="member">${name}</th><td data-key="change"><span data-jqs="badge">Changed</span><span data-part="change-summary">Proof change.</span></td><td data-key="permissions">Read components</td><td data-key="revision">#4</td></tr>`,
      { selector: "#audit-log-rows", mode: "inner" },
    );
    stream.patchElements(
      '<nav id="audit-log-pagination" data-jqs="pagination" data-navigation="manual" data-page="1" data-page-count="1" data-on:jquery-star:pagination:change="@auditLog.page" aria-label="Access audit pages"><ul><li><a data-part="previous" aria-disabled="true">Previous</a></li><li><a data-part="page" data-page="1" aria-current="page">1</a></li><li><a data-part="next" aria-disabled="true">Next</a></li></ul><p data-part="status">Page 1 of 1</p></nav>',
      { selector: "#audit-log-pagination", mode: "outer" },
    );
    stream.patchSignals(
      JSON.stringify({
        auditLogCount: 1,
        auditLogMember: member,
        auditLogMessage: "1 access event. Page 1 of 1.",
        auditLogPage: 1,
      }),
    );
  });
}

describe("Audit Log source block", () => {
  let requests: AuditSignals[];

  beforeEach(() => {
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        const { signal: _signal, ...requestInit } = init;
        const request = new Request(url, requestInit);
        const read = await ServerSentEventGenerator.readSignals(request);
        if (!read.success) throw new Error(read.error);
        const signals = read.signals as unknown as AuditSignals;
        requests.push(signals);
        return responseFor(signals.auditLogMember);
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

  it("filters history through Datastar signals and re-enhances patched Pagination", async () => {
    const member = root().querySelector<HTMLSelectElement>("#audit-log-member")!;
    member.value = "luis";
    member.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(root().querySelector("#audit-log-rows")?.textContent).toContain("Luis Ortiz");
    expect(requests).toEqual([
      expect.objectContaining({ auditLogMember: "luis", auditLogPage: 1, auditLogQuery: "" }),
    ]);
    await vi.waitFor(() =>
      expect(root().querySelector<HTMLElement>("#audit-log-pagination")?.dataset.state).toBe(
        "single",
      ),
    );
  });

  it("refreshes when a successful Access Manager save reaches the window boundary", async () => {
    root().dispatchEvent(
      new CustomEvent("jquery-star:access-manager:saved", {
        bubbles: true,
        detail: { member: "maya" },
      }),
    );

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ auditLogMember: "all", auditLogPage: 1 });
  });
});

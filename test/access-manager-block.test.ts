import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/access-manager";

interface AccessSignals extends Record<string, unknown> {
  accessManagerMember: string;
  accessManagerPermissions: string[];
}

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/access-manager.html"), "utf8");
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-block="access-manager"]')!;
}

function transferMarkup(permissions: string[]): string {
  const catalog = [
    ["components:read", "Read components"],
    ["components:write", "Write components"],
    ["releases:deploy", "Deploy releases"],
    ["members:invite", "Invite members"],
    ["billing:manage", "Manage billing"],
    ["audit:read", "Read audit log"],
  ];
  const assigned = new Set(permissions);
  const options = (selected: boolean): string =>
    catalog
      .filter(([value]) => assigned.has(value!) === selected)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
  return `<div id="access-manager-permissions" data-jqs="transfer-list" data-name="permissions" data-value='${JSON.stringify(permissions)}' data-on:jquery-star:transfer-list:change="@accessManager.change"><div data-part="pane"><label for="access-manager-available">Available permissions</label><select id="access-manager-available" data-part="available" multiple>${options(false)}</select></div><div data-part="controls" role="group" aria-label="Assignment controls"><button data-part="add">Add</button><button data-part="remove">Remove</button><button data-part="add-all">Add all</button><button data-part="remove-all">Remove all</button></div><div data-part="pane"><label for="access-manager-selected">Assigned permissions</label><select id="access-manager-selected" data-part="selected" multiple>${options(true)}</select></div><div data-part="order-controls" role="group" aria-label="Priority controls"><button data-part="move-up">Move up</button><button data-part="move-down">Move down</button></div><p data-part="status"></p></div>`;
}

function responseFor(member: string, permissions: string[], saved: boolean): Response {
  const name = member === "luis" ? "Luis Ortiz" : "Maya Chen";
  return ServerSentEventGenerator.stream((stream) => {
    stream.patchElements(transferMarkup(permissions), {
      selector: "#access-manager-permissions",
      mode: "outer",
    });
    stream.patchSignals(
      JSON.stringify({
        accessManagerCount: permissions.length,
        accessManagerMember: member,
        accessManagerMessage: saved
          ? `${name} access saved at revision 1.`
          : `${name} access loaded from the backend.`,
        accessManagerPermissions: permissions,
      }),
    );
  });
}

describe("Access Manager source block", () => {
  const saved = new Map<string, string[]>();
  let requests: Array<{ method: string; signals: AccessSignals }>;

  beforeEach(() => {
    saved.clear();
    saved.set("maya", ["components:read", "components:write", "releases:deploy"]);
    saved.set("luis", ["components:read", "audit:read"]);
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        const { signal: _signal, ...requestInit } = init;
        const request = new Request(url, requestInit);
        const read = await ServerSentEventGenerator.readSignals(request);
        if (!read.success) throw new Error(read.error);
        const signals = read.signals as unknown as AccessSignals;
        const method = request.method;
        requests.push({ method, signals });
        if (method === "POST")
          saved.set(signals.accessManagerMember, signals.accessManagerPermissions);
        const permissions = saved.get(signals.accessManagerMember) ?? [];
        return responseFor(signals.accessManagerMember, permissions, method === "POST");
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

  it("persists changed Transfer List membership through the official SDK path", async () => {
    const available = root().querySelector<HTMLSelectElement>("#access-manager-available")!;
    available.querySelector<HTMLOptionElement>('option[value="audit:read"]')!.selected = true;
    available.dispatchEvent(new Event("change", { bubbles: true }));
    root().querySelector<HTMLButtonElement>('[data-part="add"]')!.click();

    expect($(root()).star<AccessSignals>("state")?.accessManagerPermissions).toEqual([
      "components:read",
      "components:write",
      "releases:deploy",
      "audit:read",
    ]);
    root().querySelector<HTMLFormElement>('[data-access-manager-part="form"]')!.requestSubmit();

    await vi.waitFor(() =>
      expect($('[data-text="$accessManagerMessage"]').text()).toContain("saved at revision 1"),
    );
    expect(requests).toEqual([
      {
        method: "POST",
        signals: {
          accessManagerMember: "maya",
          accessManagerPermissions: [
            "components:read",
            "components:write",
            "releases:deploy",
            "audit:read",
          ],
        },
      },
    ]);
    expect($.star.ui.transferList.value("#access-manager-permissions")).toContain("audit:read");
  });

  it("loads another member and re-enhances the server-replaced Transfer List", async () => {
    const member = root().querySelector<HTMLSelectElement>("#access-manager-member")!;
    member.value = "luis";
    member.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() =>
      expect($.star.ui.transferList.value("#access-manager-permissions")).toEqual([
        "components:read",
        "audit:read",
      ]),
    );
    expect(requests[0]).toMatchObject({ method: "GET" });
    expect(requests[0]?.signals.accessManagerMember).toBe("luis");
    expect($('[data-text="$accessManagerMessage"]').text()).toBe(
      "Luis Ortiz access loaded from the backend.",
    );
  });
});

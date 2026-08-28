import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import $ from "jquery";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import "../registry/blocks/profile-settings";

let blockHTML = "";

beforeAll(async () => {
  blockHTML = await readFile(resolve("registry/blocks/profile-settings.html"), "utf8");
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-block="profile-settings"]')!;
}

describe("Profile Settings source block", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  beforeEach(() => {
    document.body.innerHTML = blockHTML;
    $.star.ui.enhance(document);
    $(root()).star();
  });

  afterEach(() => {
    $(root()).star("destroy");
    vi.unstubAllGlobals();
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
  });

  it("saves current native editable values through the copied action module", async () => {
    const updatedAt = "2026-08-28T19:15:00.000Z";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          displayName: "Grace Hopper",
          email: "grace@example.com",
          environment: "test",
          revision: 3,
          updatedAt,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    $.star.ui.editable.set('[data-profile-field="display-name"]', "Grace Hopper");
    $.star.ui.editable.set('[data-profile-field="email"]', "grace@example.com");

    root().querySelector<HTMLFormElement>('[data-profile-part="form"]')!.requestSubmit();

    await vi.waitFor(() =>
      expect($('[data-text="$profileSettingsMessage"]').text()).toBe("Profile revision 3 saved."),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/demo/profile");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      displayName: "Grace Hopper",
      email: "grace@example.com",
    });
    expect($('[data-profile-value="revision"]').text()).toBe("3");
    expect($('[data-profile-value="environment"]').text()).toBe("test");
    expect($('[data-profile-value="updated"]').attr("datetime")).toBe(updatedAt);
  });

  it("rotates a server-owned invite URL that Clipboard reads live", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ inviteUrl: "https://jqstar.dev/invite/test-9", revision: 9 }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    $('[data-on\\:click="@profileSettings.rotateInvite"]').trigger("click");

    await vi.waitFor(() =>
      expect($.star.ui.clipboard.text('[data-profile-part="invite"]')).toBe(
        "https://jqstar.dev/invite/test-9",
      ),
    );
    $('[data-profile-part="invite"] [data-part="trigger"]').trigger("click");
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://jqstar.dev/invite/test-9"),
    );
    expect($('[data-text="$profileSettingsMessage"]').text()).toBe(
      "Invite URL revision 9 is ready to copy.",
    );
  });

  it("surfaces a structured backend failure without replacing the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Profile write was rejected." }), {
          headers: { "Content-Type": "application/json" },
          status: 422,
        }),
      ),
    );

    root().querySelector<HTMLFormElement>('[data-profile-part="form"]')!.requestSubmit();

    await vi.waitFor(() =>
      expect($('[data-text="$profileSettingsMessage"]').text()).toBe("Profile write was rejected."),
    );
    expect(root().querySelector('[data-profile-part="form"]')).not.toBeNull();
  });
});

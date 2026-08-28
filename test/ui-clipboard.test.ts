import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#clipboard")!;
}

function trigger(): HTMLButtonElement {
  return root().querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
}

describe("jQuery Star Clipboard", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="clipboard" data-jqs="clipboard" data-reset-delay="100">
          <input data-part="value" value="npm install jquery-star">
          <button data-part="trigger" data-on:click="@ui.clipboard.copy">Copy</button>
          <span data-part="status"></span>
        </div>
        <button id="external" data-on:click="@ui.clipboard.copy('#clipboard', 'explicit value')">Copy explicit</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    vi.useRealTimers();
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies a live native control value and announces lifecycle state", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const before = vi.fn();
    const copied = vi.fn();
    root().addEventListener("jquery-star:clipboard:before-copy", before);
    root().addEventListener("jquery-star:clipboard:copy", copied);

    trigger().click();
    await vi.waitFor(() => expect($.star.ui.clipboard.state(root())).toBe("copied"));

    expect(writeText).toHaveBeenCalledWith("npm install jquery-star");
    expect($.star.ui.clipboard.text(root())).toBe("npm install jquery-star");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Copied to clipboard.");
    expect(before).toHaveBeenCalledOnce();
    expect(copied).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(100);
    expect($.star.ui.clipboard.state(root())).toBe("idle");
  });

  it("supports an external named action and explicit text override", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    $("#external").trigger("click");

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("explicit value"));
  });

  it("honors cancelable copying and disabled native triggers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    root().addEventListener("jquery-star:clipboard:before-copy", (event) => event.preventDefault());

    await expect($.star.ui.clipboard.copy(root())).resolves.toBe("npm install jquery-star");
    expect(writeText).not.toHaveBeenCalled();

    trigger().disabled = true;
    await expect($.star.ui.clipboard.copy(root(), "disabled")).resolves.toBe("disabled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports permission failures without interpreting copied text as markup", async () => {
    const failure = new Error("permission denied");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(failure) },
    });
    const error = vi.fn();
    root().addEventListener("jquery-star:clipboard:error", error);
    const value = '<img src=x onerror="throw 1">';

    await expect($.star.ui.clipboard.copy(root(), value)).rejects.toThrow("permission denied");

    expect(root().dataset.state).toBe("error");
    expect(root().querySelector("img")).toBeNull();
    expect(root().querySelector('[data-part="status"]')?.textContent).toContain("Copy failed");
    expect(error).toHaveBeenCalledOnce();
  });
});

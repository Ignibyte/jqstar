import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#payload")!;
}

function status(): HTMLElement {
  return root().querySelector<HTMLElement>('[data-part="status"]')!;
}

describe("jQuery Star Code Block", () => {
  const writeText = vi.fn<(value: string) => Promise<void>>();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    document.body.innerHTML = `
      <main id="app">
        <div id="payload" data-jqs="code-block">
          <header data-part="header">
            <span data-part="language">JSON</span>
            <button data-part="copy" data-on:click="@ui.code-block.copy">Copy</button>
          </header>
          <pre><code data-part="code">{\n  "status": "ready"\n}</code></pre>
          <p data-part="status"></p>
        </div>
        <button id="external-copy" data-on:click="@ui.code-block.copy('#payload')">Copy payload</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  });

  it.each([false, true])(
    "announces pending copy in replacement status, failure: %s",
    async (fails) => {
      const failure = new Error("copy denied");
      let finish: (() => void) | undefined;
      writeText.mockReturnValue(
        new Promise<void>((resolve, reject) => {
          finish = () => {
            if (fails) reject(failure);
            else resolve();
          };
        }),
      );
      const originalText = $.star.ui.codeBlock.text(root());
      const copying = $.star.ui.codeBlock.copy(root()).then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
      );
      const oldStatus = status();
      oldStatus.replaceWith(oldStatus.cloneNode(false));
      const code = root().querySelector('[data-part="code"]');
      if (!code || !finish) throw new Error("Missing copy fixture.");
      code.textContent = "replacement text";
      $.star.ui.enhance(root());
      finish();
      const result = await copying;
      await $.star.whenEnhanced();
      expect(writeText).toHaveBeenCalledWith(originalText);
      expect($.star.ui.codeBlock.text(root())).toBe("replacement text");
      expect(result).toEqual(
        fails ? { value: undefined, error: failure } : { value: originalText, error: undefined },
      );
      expect(status().textContent).toContain(fails ? "Copy failed." : "Copied to clipboard.");
      expect(oldStatus.textContent).toBe("");
    },
  );

  it("enhances authored code, copy control, and polite status", () => {
    const copy = root().querySelector<HTMLButtonElement>('[data-part="copy"]')!;
    expect(copy.type).toBe("button");
    expect(copy.getAttribute("aria-describedby")).toBe(status().id);
    expect(status().getAttribute("aria-live")).toBe("polite");
    expect(status().getAttribute("aria-atomic")).toBe("true");
  });

  it("returns the exact authored text", () => {
    expect($.star.ui.codeBlock.text(root())).toBe('{\n  "status": "ready"\n}');
  });

  it("copies through the API and emits lifecycle detail", async () => {
    const before = vi.fn();
    const copied = vi.fn();
    root().addEventListener("jquery-star:code-block:before-copy", before);
    root().addEventListener("jquery-star:code-block:copy", copied);

    await expect($.star.ui.codeBlock.copy(root())).resolves.toContain('"status": "ready"');
    expect(writeText).toHaveBeenCalledWith('{\n  "status": "ready"\n}');
    expect(before).toHaveBeenCalledOnce();
    expect(copied).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("copied");
    expect(status().textContent).toBe("Copied to clipboard.");
  });

  it("copies through closest and explicit named actions", async () => {
    root().querySelector<HTMLButtonElement>('[data-part="copy"]')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    $("#external-copy").trigger("click");
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  });

  it("honors cancellation without touching the clipboard", async () => {
    root().addEventListener("jquery-star:code-block:before-copy", (event) =>
      event.preventDefault(),
    );
    await expect($.star.ui.codeBlock.copy(root())).resolves.toContain("ready");
    expect(writeText).not.toHaveBeenCalled();
    expect(status().textContent).toBe("");
  });

  it("announces and emits clipboard failures", async () => {
    const failure = new Error("denied");
    const error = vi.fn();
    writeText.mockRejectedValue(failure);
    root().addEventListener("jquery-star:code-block:error", error);

    await expect($.star.ui.codeBlock.copy(root())).rejects.toThrow("denied");
    expect(root().dataset.state).toBe("error");
    expect(status().textContent).toContain("Copy failed");
    expect(error).toHaveBeenCalledOnce();
    expect((error.mock.calls[0]?.[0] as CustomEvent).detail.error).toBe(failure);
  });
});

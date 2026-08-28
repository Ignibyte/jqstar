import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#payload")!;
}

describe("jQuery Star JSON Viewer", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="payload" data-jqs="json-viewer">
          <header data-part="header">
            <button data-on:click="@ui.json-viewer.expand-all">Expand all</button>
            <button data-on:click="@ui.json-viewer.collapse-all">Collapse all</button>
          </header>
          <script type="application/json" data-part="source">
            {"service":"jqstar","healthy":true,"metrics":{"requests":12840},"regions":["ord","dfw"]}
          </script>
          <div data-part="tree"></div>
          <p data-part="status"></p>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("renders nested JSON as native disclosure branches and typed leaves", () => {
    expect(root().dataset.state).toBe("ready");
    expect(root().querySelectorAll('details[data-part="branch"]')).toHaveLength(3);
    expect(root().querySelector('details[data-path=""]')?.hasAttribute("open")).toBe(true);
    expect(root().querySelector('[data-type="boolean"]')?.textContent).toBe("true");
    expect(root().querySelector('[data-type="number"]')?.textContent).toBe("12840");
    expect(root().querySelector('[data-part="status"]')?.textContent).toContain("JSON values");
  });

  it("expands and collapses every branch through named actions", async () => {
    const buttons = root().querySelectorAll<HTMLButtonElement>("button");
    buttons[0]!.click();
    await vi.waitFor(() =>
      expect(
        Array.from(root().querySelectorAll<HTMLDetailsElement>("details")).every(
          (details) => details.open,
        ),
      ).toBe(true),
    );
    buttons[1]!.click();
    await vi.waitFor(() =>
      expect(
        Array.from(root().querySelectorAll<HTMLDetailsElement>("details")).every(
          (details) => !details.open,
        ),
      ).toBe(true),
    );
  });

  it("sets and returns structured values without interpreting strings as HTML", () => {
    const update = vi.fn();
    root().addEventListener("jquery-star:json-viewer:update", update);
    const value = { nested: { message: '<img src=x onerror="throw 1">' }, count: 2 };
    $.star.ui.jsonViewer.set(root(), value);
    expect($.star.ui.jsonViewer.value(root())).toEqual(value);
    expect(root().querySelector("img")).toBeNull();
    expect(root().textContent).toContain("<img src=x");
    expect(update).toHaveBeenCalledOnce();
  });

  it("rerenders only when the authored JSON source changes", () => {
    const update = vi.fn();
    root().addEventListener("jquery-star:json-viewer:update", update);
    $.star.ui.enhance(root());
    expect(update).not.toHaveBeenCalled();
    const source = root().querySelector<HTMLScriptElement>('[data-part="source"]')!;
    source.textContent = '{"revision":2}';
    $.star.ui.enhance(root());
    expect($.star.ui.jsonViewer.value(root())).toEqual({ revision: 2 });
    expect(update).toHaveBeenCalledOnce();
  });

  it("announces invalid authored JSON without rendering partial content", () => {
    const error = vi.fn();
    root().addEventListener("jquery-star:json-viewer:error", error);
    root().querySelector<HTMLScriptElement>('[data-part="source"]')!.textContent = "{broken";
    $.star.ui.enhance(root());
    expect(root().dataset.state).toBe("error");
    expect(root().querySelector('[data-part="error"]')?.getAttribute("role")).toBe("alert");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe(
      "JSON could not be parsed.",
    );
    expect(error).toHaveBeenCalledOnce();
  });

  it("rejects circular API values before changing the source", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => $.star.ui.jsonViewer.set(root(), circular)).toThrow();
    expect($.star.ui.jsonViewer.value(root())).toMatchObject({ service: "jqstar" });
  });
});

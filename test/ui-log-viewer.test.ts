import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#logs")!;
}

function logEntries(): HTMLElement[] {
  return Array.from(root().querySelectorAll<HTMLElement>('[data-part="entry"]'));
}

describe("jQuery Star Log Viewer", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <section id="logs" data-jqs="log-viewer" data-level="all" data-max="3">
          <header data-part="header">
            <select data-part="filter" aria-label="Minimum log level">
              <option value="all">All levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <button data-part="pause" data-on:click="@ui.log-viewer.toggle">Pause logs</button>
            <button data-part="clear" data-on:click="@ui.log-viewer.clear">Clear logs</button>
          </header>
          <div data-part="viewport">
            <ol data-part="entries">
              <li data-part="entry" data-level="info"><span data-part="message">Ready</span></li>
              <li data-part="entry" data-level="warn"><span data-part="message">Slow</span></li>
            </ol>
          </div>
          <p data-part="status"></p>
        </section>
        <button id="external-pause" data-on:click="@ui.log-viewer.pause('#logs')">Pause external log</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("applies the live-log accessibility and state contract", () => {
    const entries = root().querySelector<HTMLElement>('[data-part="entries"]')!;
    const viewport = root().querySelector<HTMLElement>('[data-part="viewport"]')!;
    expect(entries.getAttribute("role")).toBeNull();
    expect(viewport.getAttribute("role")).toBe("log");
    expect(viewport.getAttribute("aria-live")).toBe("polite");
    expect(viewport.getAttribute("aria-relevant")).toBe("additions text");
    expect(viewport.tabIndex).toBe(0);
    expect(root().dataset.state).toBe("live");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("2 of 2 entries · Live");
  });

  it("appends safe structured entries, emits lifecycle events, and trims capacity", () => {
    const before = vi.fn();
    const appended = vi.fn();
    root().addEventListener("jquery-star:log-viewer:before-append", before);
    root().addEventListener("jquery-star:log-viewer:append", appended);

    $.star.ui.logViewer.append(root(), {
      id: "request-3",
      level: "error",
      message: '<img src=x onerror="throw 1"> failed safely',
      source: "api",
      timestamp: "2026-08-28T18:30:00Z",
    });
    $.star.ui.logViewer.append(root(), { level: "debug", message: "Fourth entry" });

    expect(logEntries()).toHaveLength(3);
    expect(logEntries()[0]?.textContent).toContain("Slow");
    expect(root().querySelector("img")).toBeNull();
    expect(logEntries()[1]?.textContent).toContain("failed safely");
    expect(before).toHaveBeenCalledTimes(2);
    expect(appended).toHaveBeenCalledTimes(2);
    expect($.star.ui.logViewer.state(root())).toMatchObject({ count: 3, visible: 3 });
  });

  it("filters by minimum severity through the native select and public API", () => {
    const filter = root().querySelector<HTMLSelectElement>('[data-part="filter"]')!;
    filter.value = "warn";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    expect(logEntries()[0]?.hidden).toBe(true);
    expect(logEntries()[1]?.hidden).toBe(false);
    expect($.star.ui.logViewer.state(root())).toMatchObject({ filter: "warn", visible: 1 });

    $.star.ui.logViewer.filter(root(), "all");
    expect(logEntries().every((entry) => !entry.hidden)).toBe(true);
  });

  it("pauses and resumes announcements through one named action", async () => {
    const button = root().querySelector<HTMLButtonElement>('[data-part="pause"]')!;
    button.click();
    await vi.waitFor(() => expect(root().dataset.state).toBe("paused"));
    expect(button.textContent).toBe("Resume logs");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(root().querySelector('[data-part="viewport"]')?.getAttribute("aria-live")).toBe("off");

    button.click();
    await vi.waitFor(() => expect(root().dataset.state).toBe("live"));
    expect($.star.ui.logViewer.state(root())).toMatchObject({ paused: false, following: true });
  });

  it("targets the viewer from an external named action", async () => {
    document.querySelector<HTMLButtonElement>("#external-pause")!.click();
    await vi.waitFor(() => expect(root().dataset.state).toBe("paused"));
    expect($.star.ui.logViewer.state(root()).paused).toBe(true);
  });

  it("clears through the API and honors cancelable lifecycle events", () => {
    const cancel = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:log-viewer:before-clear", cancel);
    $.star.ui.logViewer.clear(root());
    expect(logEntries()).toHaveLength(2);
    root().removeEventListener("jquery-star:log-viewer:before-clear", cancel);
    $.star.ui.logViewer.clear(root());
    expect(logEntries()).toHaveLength(0);
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("0 of 0 entries · Live");
  });

  it("resynchronizes server-appended entries without a component observer", () => {
    root()
      .querySelector('[data-part="entries"]')!
      .insertAdjacentHTML(
        "beforeend",
        '<li data-part="entry" data-level="error"><span data-part="message">SDK event</span></li>',
      );
    $.star.ui.enhance(root());
    expect($.star.ui.logViewer.state(root())).toMatchObject({ count: 3, visible: 3 });
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("3 of 3 entries · Live");
  });
});

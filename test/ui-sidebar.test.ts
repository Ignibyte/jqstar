import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

interface MediaHarness {
  query: MediaQueryList;
  set(matches: boolean): void;
}

function mediaHarness(initial = false): MediaHarness {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    get matches() {
      return matches;
    },
    media: "(max-width: 48rem)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  return {
    query,
    set(next) {
      matches = next;
      const event = { matches: next, media: query.media } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  };
}

function sidebar(): HTMLElement {
  return document.querySelector<HTMLElement>("#workspace-sidebar")!;
}

function trigger(): HTMLButtonElement {
  return sidebar().querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
}

describe("jQuery Star Sidebar", () => {
  let media: MediaHarness;

  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    });
    localStorage.clear();
    media = mediaHarness(false);
    vi.stubGlobal("matchMedia", () => media.query);
    document.body.innerHTML = `
      <main id="app">
        <section
          id="workspace-sidebar"
          data-jqs="sidebar"
          data-collapsible="icon"
          data-value="expanded"
          data-storage-key="workspace"
        >
          <aside data-part="panel" aria-label="Workspace navigation">Navigation</aside>
          <button data-part="rail" type="button" aria-label="Toggle navigation rail"></button>
          <section data-part="content">
            <button data-part="trigger" type="button">Toggle navigation</button>
            <div data-jqs="popover">
              <button data-part="trigger" type="button">Open help</button>
              <div data-part="content">Help</div>
            </div>
            Content
          </section>
          <button data-part="backdrop" type="button" aria-label="Close navigation"></button>
        </section>
        <button id="close-sidebar" data-on:click="@ui.sidebar.close('#workspace-sidebar')">
          Close sidebar
        </button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    vi.unstubAllGlobals();
  });

  it("syncs state, trigger semantics, API, and named actions", () => {
    const panel = sidebar().querySelector<HTMLElement>('[data-part="panel"]')!;
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
    expect(trigger().getAttribute("aria-controls")).toBe(panel.id);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");

    trigger().click();
    expect(sidebar().dataset.state).toBe("collapsed");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    $.star.ui.sidebar.open(sidebar());
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
    $("#close-sidebar").trigger("click");
    expect($.star.ui.sidebar.value(sidebar())).toBe(false);
  });

  it("supports a cancelable change and the Ctrl/Cmd+B shortcut", () => {
    sidebar().addEventListener("jquery-star:sidebar:before-change", (event) => {
      const detail = (event as CustomEvent<{ expanded: boolean }>).detail;
      if (!detail.expanded) event.preventDefault();
    });
    $.star.ui.sidebar.close(sidebar());
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);

    sidebar().replaceWith(sidebar().cloneNode(true));
    $.star.ui.enhance(document);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "b" }),
    );
    expect($.star.ui.sidebar.value(sidebar())).toBe(false);
    expect(localStorage.getItem("jquery-star:sidebar:workspace")).toBe("collapsed");
  });

  it("accepts a server-patched value", () => {
    $.star.ui.sidebar.close(sidebar());
    sidebar().dataset.value = "expanded";
    $.star.ui.enhance(sidebar());
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
    expect(sidebar().dataset.state).toBe("expanded");
  });

  it("does not claim triggers owned by nested components", () => {
    sidebar()
      .querySelector<HTMLButtonElement>('[data-jqs="popover"] [data-part="trigger"]')!
      .click();
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
  });

  it("starts closed on mobile and restores the desktop state", () => {
    sidebar().removeAttribute("data-value");
    media.set(true);
    $.star.ui.enhance(sidebar());
    expect(sidebar().dataset.mobile).toBe("true");
    expect($.star.ui.sidebar.value(sidebar())).toBe(false);

    trigger().click();
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
    expect(sidebar().querySelector<HTMLButtonElement>('[data-part="backdrop"]')!.hidden).toBe(
      false,
    );
    sidebar().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect($.star.ui.sidebar.value(sidebar())).toBe(false);
    expect(document.activeElement).toBe(trigger());

    media.set(false);
    expect(sidebar().dataset.mobile).toBe("false");
    expect($.star.ui.sidebar.value(sidebar())).toBe(true);
  });
});

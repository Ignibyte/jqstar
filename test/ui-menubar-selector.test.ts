import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing Menubar selector fixture.");
  return value;
}

function bar(id: string): HTMLElement {
  return required(document.getElementById(id));
}

describe("Menubar action and facade selectors", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <span class="shared">Unrelated selector match</span>
        <div id="local-bar" class="target shared" data-jqs="menubar" aria-label="Local commands"
          data-on:hash-open="@ui.menubar.open('#tools')"
          data-on:plain-open="@ui.menubar.open('plain')">
          <div data-part="menu" data-jqs="menu" data-value="#tools">
            <button data-part="trigger">Hash tools</button>
            <div data-part="content"><button data-part="item" data-value="one">One</button></div>
          </div>
          <div data-part="menu" data-jqs="menu" data-value="plain">
            <button data-part="trigger">Plain tools</button>
            <div data-part="content"><button data-part="item" data-value="two">Two</button></div>
          </div>
        </div>
        <div id="tools" data-jqs="menubar" aria-label="Other commands">
          <div data-part="menu" data-jqs="menu" data-value="other">
            <button data-part="trigger">Other</button>
            <div data-part="content"><button data-part="item" data-value="three">Three</button></div>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    document.body.replaceChildren();
  });

  it("uses a current local menu value beginning with # before a competing target", () => {
    bar("local-bar").dispatchEvent(new CustomEvent("hash-open", { bubbles: true }));
    expect($.star.ui.menubar.value(bar("local-bar"))).toBe("#tools");
    expect(bar("local-bar").dataset.state).toBe("open");
    expect(bar("tools").dataset.state).toBe("closed");
  });

  it("accepts a two-argument class target selector in a named action", async () => {
    const app = required($("#app").star("instance"));
    await app.run("ui.menubar.open", { args: [".target", "plain"] });
    expect($.star.ui.menubar.value(bar("local-bar"))).toBe("plain");
    expect(bar("tools").dataset.state).toBe("closed");
  });

  it("accepts a one-argument selector from outside a Menubar", async () => {
    const app = required($("#app").star("instance"));
    await app.run("ui.menubar.open", { args: [".shared"] });
    expect($.star.ui.menubar.value(bar("local-bar"))).toBe("#tools");
  });

  it("finds the matching Menubar after an unrelated selector match", () => {
    $.star.ui.menubar.open(".shared", "plain");
    expect($.star.ui.menubar.value(bar("local-bar"))).toBe("plain");
  });

  it("preserves plain implicit, #id target and element target forms", async () => {
    bar("local-bar").dispatchEvent(new CustomEvent("plain-open", { bubbles: true }));
    expect($.star.ui.menubar.value(bar("local-bar"))).toBe("plain");
    const app = required($("#app").star("instance"));
    await app.run("ui.menubar.open", { args: ["#tools", "other"] });
    expect($.star.ui.menubar.value(bar("tools"))).toBe("other");
    await app.run("ui.menubar.focus", { args: [bar("local-bar"), "#tools"] });
    expect(document.activeElement).toBe(
      bar("local-bar").querySelector('[data-value="#tools"] [data-part="trigger"]'),
    );
  });

  it("reports invalid and absent target selectors as unavailable Menubars", () => {
    expect(() => $.star.ui.menubar.open("[broken", "plain")).toThrow(
      'Menubar target did not match data-jqs="menubar".',
    );
    expect(() => $.star.ui.menubar.open(".absent", "plain")).toThrow(
      'Menubar target did not match data-jqs="menubar".',
    );
    expect(() => $.star.ui.menubar.open('[data-jqs="menu"]', "plain")).toThrow(
      'Menubar target did not match data-jqs="menubar".',
    );
    const foreign = document.implementation.createHTMLDocument("Other owner");
    foreign.body.append(bar("local-bar").cloneNode(true));
    expect(() =>
      $.star.ui.menubar.open(required(foreign.querySelector<HTMLElement>("#local-bar"))),
    ).toThrow("This UI target is unavailable in its owning Document.");
  });

  it("rejects a missing target in a two-argument local action", async () => {
    const instance = required($(bar("local-bar")).star().star("instance"));
    await expect(instance.run("ui.menubar.open", { args: [undefined, "plain"] })).rejects.toThrow(
      'Menubar target did not match data-jqs="menubar".',
    );
    await expect(instance.run("ui.menubar.open", { args: ["[broken", "plain"] })).rejects.toThrow(
      'Menubar target did not match data-jqs="menubar".',
    );
    expect($.star.ui.menubar.value(bar("local-bar"))).toBeUndefined();
    $(bar("local-bar")).star("destroy");
  });
});

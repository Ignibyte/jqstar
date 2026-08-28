import $ from "jquery";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchElements, patchSignals } from "../src/patch";

describe("signal patches", () => {
  it("merges nested values, replaces arrays, and removes null signals", () => {
    const state: Record<string, unknown> = {
      count: 1,
      user: { name: "Ada", role: "admin" },
      tags: ["old"],
      obsolete: true,
    };

    patchSignals(state, {
      count: 2,
      user: { name: "Grace" },
      tags: ["new"],
      obsolete: null,
    });

    expect(state).toEqual({
      count: 2,
      user: { name: "Grace", role: "admin" },
      tags: ["new"],
    });
  });

  it("patches only missing leaves when requested", () => {
    const state: Record<string, unknown> = {
      count: 1,
      user: { name: "Ada" },
    };

    patchSignals(
      state,
      { count: 2, user: { name: "Grace", role: "admin" }, added: true },
      { onlyIfMissing: true },
    );

    expect(state).toEqual({
      count: 1,
      user: { name: "Ada", role: "admin" },
      added: true,
    });
  });
});

describe("element patches", () => {
  beforeEach(() => {
    document.body.innerHTML = `<main id="app"></main>`;
  });

  it("morphs by id while preserving node identity, focus, input value, and handlers", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `
      <section id="profile">
        <input id="name" value="server-old">
        <span>Old</span>
      </section>
    `;
    const profile = document.querySelector("#profile")!;
    const input = document.querySelector<HTMLInputElement>("#name")!;
    const clicked = vi.fn();
    $(profile).on("click", clicked);
    input.value = "typing";
    input.focus();

    patchElements(
      root,
      `<section id="profile"><input id="name" value="server-new"><span>New</span></section>`,
    );

    expect(document.querySelector("#profile")).toBe(profile);
    expect(document.querySelector("#name")).toBe(input);
    expect(input.value).toBe("typing");
    expect(document.activeElement).toBe(input);
    expect(document.querySelector("#profile span")?.textContent).toBe("New");
    $(profile).trigger("click");
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("supports inner, append, prepend, before, after, replace, and remove modes", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<div id="before"></div><div id="target"><i>Old</i></div><div id="after"></div>`;

    patchElements(root, `<b>Inner</b>`, { selector: "#target", mode: "inner" });
    expect(document.querySelector("#target")?.innerHTML).toBe("<b>Inner</b>");

    patchElements(root, `<span class="last">Last</span>`, { selector: "#target", mode: "append" });
    patchElements(root, `<span class="first">First</span>`, {
      selector: "#target",
      mode: "prepend",
    });
    expect(document.querySelector("#target")?.firstElementChild?.className).toBe("first");
    expect(document.querySelector("#target")?.lastElementChild?.className).toBe("last");

    patchElements(root, `<u class="before-target">Before</u>`, {
      selector: "#target",
      mode: "before",
    });
    patchElements(root, `<u class="after-target">After</u>`, {
      selector: "#target",
      mode: "after",
    });
    expect(document.querySelector(".before-target")?.nextElementSibling?.id).toBe("target");
    expect(document.querySelector(".after-target")?.previousElementSibling?.id).toBe("target");

    patchElements(root, `<article id="replacement">Replaced</article>`, {
      selector: "#target",
      mode: "replace",
    });
    expect(document.querySelector("#target")).toBeNull();
    expect(document.querySelector("#replacement")?.textContent).toBe("Replaced");

    patchElements(root, "", { selector: "#replacement", mode: "remove" });
    expect(document.querySelector("#replacement")).toBeNull();
  });

  it("removes elements by the IDs in a selector-free Datastar patch", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<div id="first"></div><div id="keep"></div><div id="second"></div>`;

    patchElements(root, `<div id="first"></div><div id="second"></div>`, {
      mode: "remove",
    });

    expect(document.querySelector("#first")).toBeNull();
    expect(document.querySelector("#second")).toBeNull();
    expect(document.querySelector("#keep")).not.toBeNull();
  });

  it("preserves data-ignore-morph subtrees", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `
      <section id="panel">
        <div data-ignore-morph><strong>Keep me</strong></div>
        <span>Old</span>
      </section>
    `;

    patchElements(
      root,
      `<section id="panel"><div data-ignore-morph><strong>Replace me</strong></div><span>New</span></section>`,
    );

    expect(document.querySelector("[data-ignore-morph]")?.textContent).toBe("Keep me");
    expect(document.querySelector("#panel > span")?.textContent).toBe("New");
  });

  it("patches SVG content and rejects missing targets", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<svg id="chart"></svg>`;

    patchElements(root, `<circle id="point" cx="5" cy="5" r="2"/>`, {
      selector: "#chart",
      mode: "append",
      namespace: "svg",
    });

    expect(document.querySelector("#point")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(() => patchElements(root, `<p>Missing</p>`, { selector: "#missing" })).toThrow(
      /did not match a target/,
    );
  });
});

import $ from "jquery";
import { Idiomorph } from "idiomorph";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
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

  it("deeply imports MathML content into the root document", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<math id="formula"></math>`;

    patchElements(root, `<mrow id="row"><mi id="variable">x</mi></mrow>`, {
      selector: "#formula",
      mode: "append",
      namespace: "mathml",
    });

    const variable = document.querySelector("#variable")!;
    expect(variable.textContent).toBe("x");
    expect(variable.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(variable.ownerDocument).toBe(document);
  });

  it("does not parse markup for selector-based removals", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<svg id="target"></svg>`;

    expect(() =>
      patchElements(root, `<broken>`, {
        selector: "#target",
        mode: "remove",
        namespace: "svg",
      }),
    ).not.toThrow();
    expect(document.querySelector("#target")).toBeNull();
  });

  it("filters selector-free patch nodes to non-empty element IDs", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="target">Old</section>`;
    const lookup = vi.spyOn(document, "getElementById");

    patchElements(root, `text<div>no id</div><section id="target">New</section>`);

    expect(document.querySelector("#target")?.textContent).toBe("New");
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup.mock.calls).toEqual([["target"], ["target"]]);
  });

  it("preserves marked roots during direct remove and replace modes", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `
      <section id="remove" data-jqs-preserve>Keep remove</section>
      <section id="replace"><i data-jqs-preserve>Keep replace</i></section>
    `;

    patchElements(root, "", { selector: "#remove", mode: "remove" });
    patchElements(root, `<strong>Replacement</strong>`, {
      selector: "#replace",
      mode: "replace",
    });

    expect(document.querySelector("#remove")?.textContent).toBe("Keep remove");
    expect(document.querySelector("#replace")?.textContent).toBe("Keep replace");
    expect(document.querySelector("strong")).toBeNull();
  });

  it("retains ignored and preserved nodes when outer morphs would remove them", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `
      <section id="panel">
        <i id="ignored" data-ignore-morph>Ignored</i>
        <i id="preserved" data-jqs-preserve>Preserved</i>
      </section>
    `;

    patchElements(root, `<section id="panel"><span>New</span></section>`);

    expect(document.querySelector("#ignored")?.textContent).toBe("Ignored");
    expect(document.querySelector("#preserved")?.textContent).toBe("Preserved");
    expect(document.querySelector("#panel span")?.textContent).toBe("New");
  });

  it("passes the complete morph contract for inner, selected outer, and ID outer patches", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="target"><i>Old</i></section>`;
    const morph = vi.spyOn(Idiomorph, "morph");

    patchElements(root, `<b>Inner</b>`, { selector: "#target", mode: "inner" });
    patchElements(root, `<article id="replacement">Selected</article>`, {
      selector: "#target",
    });
    patchElements(root, `<article id="replacement">By ID</article>`);

    expect(morph).toHaveBeenCalledTimes(3);
    expect(morph.mock.calls.map((call) => call[2])).toEqual([
      expect.objectContaining({
        morphStyle: "innerHTML",
        ignoreActiveValue: true,
        restoreFocus: true,
        callbacks: expect.any(Object),
      }),
      expect.objectContaining({
        morphStyle: "outerHTML",
        ignoreActiveValue: true,
        restoreFocus: true,
        callbacks: expect.any(Object),
      }),
      expect.objectContaining({
        morphStyle: "outerHTML",
        ignoreActiveValue: true,
        restoreFocus: true,
        callbacks: expect.any(Object),
      }),
    ]);
    expect(document.querySelector("#replacement")?.textContent).toBe("By ID");
  });

  it("runs requested view transitions but does not opt in by default", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="target"></section>`;
    const transition = vi.fn((update: () => void) => update());
    const previous = Object.getOwnPropertyDescriptor(document, "startViewTransition");
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: transition,
    });

    try {
      patchElements(root, `<b>Default</b>`, { selector: "#target", mode: "inner" });
      expect(transition).not.toHaveBeenCalled();
      patchElements(root, `<b>Transition</b>`, {
        selector: "#target",
        mode: "inner",
        useViewTransition: true,
      });
      expect(transition).toHaveBeenCalledOnce();
      expect(root.querySelector("b")?.textContent).toBe("Transition");
    } finally {
      if (previous) Object.defineProperty(document, "startViewTransition", previous);
      else Reflect.deleteProperty(document, "startViewTransition");
    }
  });

  it("rolls back a transaction when applying a direct patch fails", async () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="target"></section>`;
    const target = root.querySelector("#target")!;
    const failure = new Error("replace failed");
    vi.spyOn(target, "replaceWith").mockImplementation(() => {
      throw failure;
    });

    expect(() =>
      patchElements(root, `<section id="replacement"></section>`, {
        selector: "#target",
        mode: "replace",
      }),
    ).toThrow(failure);
    await expect($.star.whenEnhanced()).resolves.toBeUndefined();
  });

  it("settles a transaction when starting a view transition fails", async () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="target"></section>`;
    const failure = new Error("transition failed");
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => unknown;
    };
    const previous = transitionDocument.startViewTransition;
    transitionDocument.startViewTransition = () => {
      throw failure;
    };

    try {
      expect(() =>
        patchElements(root, `<strong>new</strong>`, {
          selector: "#target",
          mode: "inner",
          useViewTransition: true,
        }),
      ).toThrow(failure);
      await expect($.star.whenEnhanced()).resolves.toBeUndefined();
    } finally {
      if (previous) transitionDocument.startViewTransition = previous;
      else Reflect.deleteProperty(transitionDocument, "startViewTransition");
    }
  });

  it("preserves apply errors when no document kernel owns the patch", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const root = frame.contentDocument!.createElement("main");
    root.innerHTML = `<section id="target"></section>`;
    frame.contentDocument!.body.append(root);
    const target = root.querySelector("#target")!;
    const failure = new Error("unowned patch failed");
    vi.spyOn(target, "replaceWith").mockImplementation(() => {
      throw failure;
    });

    try {
      expect(() =>
        patchElements(root, `<section id="replacement"></section>`, {
          selector: "#target",
          mode: "replace",
        }),
      ).toThrow(failure);
    } finally {
      frame.remove();
    }
  });

  it("destroys nested application roots deepest-first before direct removal", () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `<section id="outer"><section id="inner"></section></section>`;
    const outer = document.querySelector("#outer")!;
    const inner = document.querySelector("#inner")!;
    const cleanupOrder: string[] = [];

    $(outer).star({
      ui: {
        "&": { mount: () => () => cleanupOrder.push(`outer:${outer.isConnected}`) },
      },
    });
    $(inner).star({
      ui: {
        "&": { mount: () => () => cleanupOrder.push(`inner:${inner.isConnected}`) },
      },
    });
    const outerInstance = $(outer).star("instance")!;
    const innerInstance = $(inner).star("instance")!;

    patchElements(root, "", { selector: "#outer", mode: "remove" });

    expect(cleanupOrder).toEqual(["inner:true", "outer:true"]);
    expect(innerInstance.destroyed).toBe(true);
    expect(outerInstance.destroyed).toBe(true);
    expect(document.querySelector("#outer")).toBeNull();
  });

  it("preserves an explicitly marked application root without remounting it", async () => {
    const root = document.querySelector("#app")!;
    root.innerHTML = `
      <section id="panel">
        <section id="preserved" data-jqs-preserve><strong>Client state</strong></section>
        <span>Old</span>
      </section>
    `;
    const preserved = document.querySelector("#preserved")!;
    const mounted = vi.fn();
    const cleaned = vi.fn();
    $(preserved).star({
      ui: {
        "&": {
          mount: () => {
            mounted();
            return cleaned;
          },
        },
      },
    });
    const instance = $(preserved).star("instance")!;

    patchElements(root, `<section id="panel"><span>New</span></section>`);
    await $.star.whenEnhanced();

    expect(document.querySelector("#preserved")).toBe(preserved);
    expect(preserved.textContent).toBe("Client state");
    expect(instance.destroyed).toBe(false);
    expect(mounted).toHaveBeenCalledOnce();
    expect(cleaned).not.toHaveBeenCalled();
    instance.destroy();
  });

  it("resolves the enhancement barrier after directives and UI controllers initialize", async () => {
    const root = document.querySelector("#app")!;
    root.setAttribute("data-signals", "{ count: 3 }");
    $(root).star();

    patchElements(
      root,
      `<output data-text="$count"></output>
       <dialog data-jqs="dialog"><h2 data-part="title">Rendered</h2></dialog>`,
      { selector: "#app", mode: "append" },
    );
    await $.star.whenEnhanced();

    expect(root.querySelector("output")?.textContent).toBe("3");
    const dialog = root.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe(
      dialog.querySelector("[data-part='title']")?.id,
    );
    $(root).star("destroy");
  });

  it("resolves a pre-existing barrier after nested directive enhancement rounds", async () => {
    const root = document.querySelector("#app")!;
    root.setAttribute("data-signals", "{ count: 7 }");
    $(root).star();
    const enhanced = $.star.whenEnhanced();

    patchElements(
      root,
      `<section data-html="\`<output data-text='$count'></output>\`"></section>`,
      { selector: "#app", mode: "append" },
    );
    await enhanced;

    expect(root.querySelector("output")?.textContent).toBe("7");
    $(root).star("destroy");
  });
});

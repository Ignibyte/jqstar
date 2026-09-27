import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";
import { patchElements } from "../src/core";

interface NestedState extends Record<string, unknown> {
  inner?: number;
  outer?: number;
}

const calls: string[] = [];
$.star.action("nestedBoundary.hit", ({ root }) => {
  calls.push(root.id);
});

function markup(): void {
  document.body.innerHTML = `<section id="outer" data-jqs data-signals="{ outer: 100 }">
    <output id="outer-value" data-text="$outer"></output>
    <section id="inner" data-jqs data-signals="{ inner: 1 }">
      <button id="inner-action" type="button" data-on:click="@nestedBoundary.hit">Hit</button>
      <output id="inner-value" data-text="$inner"></output>
    </section>
  </section>`;
}

function instance(id: "outer" | "inner") {
  const current = $(`#${id}`).star<NestedState>("instance");
  if (!current) throw new Error(`The ${id} application did not start.`);
  return current;
}

describe("nested declarative application ownership", () => {
  beforeEach(() => {
    calls.length = 0;
    markup();
  });

  afterEach(() => {
    $("#inner").star("destroy");
    $("#outer").star("destroy");
    $(document.documentElement).star("destroy");
    document.body.innerHTML = "";
  });

  it.each(["outer-first", "inner-first"] as const)(
    "keeps one child directive and distinct signals with %s startup",
    async (order) => {
      const roots = order === "outer-first" ? ["outer", "inner"] : ["inner", "outer"];
      for (const root of roots) $(`#${root}`).star();
      await $.star.whenEnhanced();

      document.querySelector<HTMLButtonElement>("#inner-action")?.click();
      await $.star.whenEnhanced();
      expect(calls).toEqual(["inner"]);
      expect(instance("outer").state).toEqual({ outer: 100 });
      expect(instance("inner").state).toEqual({ inner: 1 });
      expect($("#outer-value").text()).toBe("100");
      expect($("#inner-value").text()).toBe("1");
    },
  );

  it("keeps page-wide boot's document scope", async () => {
    $.star.boot();
    await $.star.whenEnhanced();
    const page = $(document.documentElement).star<NestedState>("instance");
    expect(page?.state).toEqual({ outer: 100, inner: 1 });
    expect($("#outer-value").text()).toBe("100");
    expect($("#inner-value").text()).toBe("1");
  });

  it("keeps a late child application isolated through an attribute change and native move", async () => {
    const child = document.querySelector<HTMLElement>("#inner");
    const outer = document.querySelector<HTMLElement>("#outer");
    if (!child || !outer) throw new Error("The nested fixture is missing.");
    child.remove();
    $(outer).star();
    outer.append(child);
    $(child).star();
    await $.star.whenEnhanced();
    expect(instance("outer").state).toEqual({ outer: 100 });
    expect(instance("inner").state).toEqual({ inner: 1 });

    const button = child.querySelector<HTMLButtonElement>("#inner-action");
    if (!button) throw new Error("The nested action is missing.");
    button.setAttribute("data-on:click", "@nestedBoundary.hit");
    child.setAttribute("data-signals", "{ inner: 2 }");
    const parking = document.createElement("div");
    outer.append(parking);
    parking.append(child);
    await $.star.whenEnhanced();
    button.click();
    await $.star.whenEnhanced();
    expect(calls).toEqual(["inner"]);
    expect(instance("outer").state).toEqual({ outer: 100 });
    expect(instance("inner").state).toEqual({ inner: 2 });
    expect(instance("inner").destroyed).toBe(false);

    $(outer).star("destroy");
    button.click();
    await $.star.whenEnhanced();
    expect(calls).toEqual(["inner", "inner"]);
    expect(instance("inner").destroyed).toBe(false);
  });

  it("retains a preserved child through a parent patch and releases it on ordinary removal", async () => {
    $("#outer").star();
    $("#inner").star();
    const outer = document.querySelector<HTMLElement>("#outer");
    const child = document.querySelector<HTMLElement>("#inner");
    if (!outer || !child) throw new Error("The nested fixture is missing.");
    const childInstance = instance("inner");
    child.setAttribute("data-jqs-preserve", "");
    patchElements(outer, '<section id="inner"><p>Replacement</p></section>');
    await $.star.whenEnhanced();
    expect(document.querySelector("#inner")).toBe(child);
    expect(childInstance.destroyed).toBe(false);
    child.querySelector<HTMLButtonElement>("#inner-action")?.click();
    expect(calls).toEqual(["inner"]);
    expect(instance("outer").state).toEqual({ outer: 100 });

    child.removeAttribute("data-jqs-preserve");
    patchElements(outer, "", { selector: "#inner", mode: "remove" });
    await $.star.whenEnhanced();
    expect(child.isConnected).toBe(false);
    expect(childInstance.destroyed).toBe(true);
    expect(instance("outer").state).toEqual({ outer: 100 });
  });

  it("keeps named component markers and unmarked nested signals in the parent scope", async () => {
    document.body.innerHTML = `<section id="outer" data-jqs data-signals="{ outer: 100 }">
      <section data-signals="{ nested: 2 }">
        <button id="component" data-jqs="button" type="button" data-on:click="@nestedBoundary.hit">Hit</button>
        <output id="nested-value" data-text="$nested"></output>
      </section>
    </section>`;
    $("#outer").star();
    await $.star.whenEnhanced();
    expect(instance("outer").state).toEqual({ outer: 100, nested: 2 });
    expect($("#nested-value").text()).toBe("2");
    document.querySelector<HTMLButtonElement>("#component")?.click();
    await $.star.whenEnhanced();
    expect(calls).toEqual(["outer"]);
  });
});

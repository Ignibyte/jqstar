import $ from "jquery";
import { afterEach, expect, it } from "vitest";
import { installStarCore } from "../src/core";
import { installStarCSP } from "../src/csp";

afterEach(() => {
  const installed: Partial<Pick<JQueryStatic, "star">> = $;
  installed.star?.dispose();
  document.body.replaceChildren();
});

it.each(["behavior", "trusted", "csp"])(
  "preserves native model values and change notifications through %s",
  async (profile) => {
    document.body.innerHTML = `<form id="app">
      <input id="query" name="query" data-bind:text>
      <input id="enabled" name="enabled" type="checkbox" data-bind:enabled>
      <input id="red" name="colors" type="checkbox" value="red" data-bind:colors>
      <input id="blue" name="colors" type="checkbox" value="blue" data-bind:colors>
      <input id="small" name="size" type="radio" value="small" data-bind:size>
      <input id="large" name="size" type="radio" value="large" data-bind:size>
      <select id="tags" name="tags" multiple data-bind:tags>
        <option value="a">A</option><option value="b">B</option>
      </select>
    </form>`;
    const initial = {
      text: "initial",
      enabled: false,
      colors: ["red"],
      size: "small",
      tags: ["a"],
    };
    const form = required(document.querySelector("form"));
    const writes: string[] = [];
    form.addEventListener(
      "jquery-star:model-write",
      (event) => writes.push((event.target as Element).id),
      true,
    );
    const installed = profile === "csp" ? installStarCSP($) : installStarCore($);
    if (profile === "behavior") {
      $(form).star({
        state: initial,
        ui: {
          "#query": { model: "text" },
          "#enabled": { model: "enabled" },
          '[name="colors"]': { model: "colors" },
          '[name="size"]': { model: "size" },
          "#tags": { model: "tags" },
        },
      });
    } else {
      form.setAttribute("data-signals", JSON.stringify(initial));
      installed.star.boot(form);
    }
    const state = required($(form).star<typeof initial>("state"));
    const expectedWrites = profile === "behavior" ? [] : ["query"];
    expect(writes).toEqual(expectedWrites);
    expect($(form).serializeArray()).toEqual([
      { name: "query", value: "initial" },
      { name: "colors", value: "red" },
      { name: "size", value: "small" },
      { name: "tags", value: "a" },
    ]);

    Object.assign(state, {
      text: "changed",
      enabled: true,
      colors: ["blue"],
      size: "large",
      tags: ["b"],
    });
    await installed.star.nextUpdate();
    expect(writes).toEqual([...expectedWrites, ...expectedWrites]);
    expect($(form).serializeArray()).toEqual([
      { name: "query", value: "changed" },
      { name: "enabled", value: "on" },
      { name: "colors", value: "blue" },
      { name: "size", value: "large" },
      { name: "tags", value: "b" },
    ]);

    $("#small").prop("checked", false).trigger("change");
    $("#blue").prop("checked", false).trigger("change");
    $("#tags").val(["a"]).trigger("change");
    $("#query").val("typed").trigger("input");
    await installed.star.nextUpdate();
    expect({ ...state }).toEqual({
      text: "typed",
      enabled: true,
      colors: [],
      size: "large",
      tags: ["a"],
    });
    expect(writes).toEqual([...expectedWrites, ...expectedWrites]);
  },
);

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Required test fixture is missing.");
  return value;
}

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

async function updated(): Promise<void> {
  await $.star.nextUpdate();
}

describe("jQuery Star", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    $("body").children().star("destroy");
    vi.useRealTimers();
  });

  it("reactively binds state and computed values to scoped selectors", async () => {
    document.body.innerHTML = `
      <section id="counter">
        <button class="decrement">-</button>
        <output class="count"></output>
      </section>
    `;

    $("#counter").star({
      state: { count: 0 },
      computed: {
        doubled: ({ state }) => state.count * 2,
      },
      actions: {
        decrement: ({ state }) => state.count--,
      },
      ui: {
        ".count": {
          text: ({ state, computed }) => `${state.count} / ${computed.doubled}`,
        },
        ".decrement": {
          disabled: ({ state }) => state.count === 0,
          on: { click: "decrement" },
        },
      },
    });

    const state = $("#counter").star<{ count: number }>("state")!;
    expect($(".count").text()).toBe("0 / 0");
    expect($(".decrement").prop("disabled")).toBe(true);

    state.count = 3;
    await updated();

    expect($(".count").text()).toBe("3 / 6");
    expect($(".decrement").prop("disabled")).toBe(false);
  });

  it("uses delegated named actions for elements inserted later", async () => {
    document.body.innerHTML = `<section id="app"><output></output></section>`;

    $("#app").star({
      state: { count: 0 },
      actions: {
        increment: ({ state }) => state.count++,
      },
      ui: {
        output: { text: ({ state }) => state.count },
        ".increment": { on: { click: "increment" } },
      },
    });

    $("#app").append('<button class="increment">+</button>');
    $(".increment").trigger("click");
    await updated();

    expect($("output").text()).toBe("1");
  });

  it("supports text, visibility, class, attribute, property, and style bindings", async () => {
    document.body.innerHTML = `
      <section id="app">
        <a class="status"></a>
        <div class="markup"></div>
      </section>
    `;

    $("#app").star({
      state: { ready: false },
      ui: {
        ".status": {
          text: ({ state }) => (state.ready ? "Ready" : "Waiting"),
          show: ({ state }) => state.ready,
          class: { ready: ({ state }) => state.ready },
          attr: {
            href: ({ state }) => (state.ready ? "/ready" : null),
            "aria-live": "polite",
          },
          prop: { title: ({ state }) => (state.ready ? "Done" : "Pending") },
          style: { color: ({ state }) => (state.ready ? "green" : "red") },
        },
        ".markup": {
          html: ({ state }) => (state.ready ? "<strong>Complete</strong>" : ""),
        },
      },
    });

    const state = $("#app").star<{ ready: boolean }>("state")!;
    expect($(".status").text()).toBe("Waiting");
    expect($(".status").css("display")).toBe("none");
    expect($(".status").attr("href")).toBeUndefined();

    state.ready = true;
    await updated();

    expect($(".status").text()).toBe("Ready");
    expect($(".status").hasClass("ready")).toBe(true);
    expect($(".status").attr("href")).toBe("/ready");
    expect($(".status").attr("aria-live")).toBe("polite");
    expect($(".status").prop("title")).toBe("Done");
    expect($<HTMLElement>(".status").get(0)?.style.color).toBe("green");
    expect($(".markup strong").text()).toBe("Complete");
  });

  it("provides two-way model binding for text, checkbox, and nested state", async () => {
    document.body.innerHTML = `
      <form id="form">
        <input name="query">
        <input name="enabled" type="checkbox">
        <output></output>
      </form>
    `;

    $("#form").star({
      state: { filters: { query: "initial", enabled: false } },
      ui: {
        '[name="query"]': { model: "filters.query" },
        '[name="enabled"]': { model: "filters.enabled" },
        output: {
          text: ({ state }) => `${state.filters.query}:${state.filters.enabled}`,
        },
      },
    });

    expect($("[name=query]").val()).toBe("initial");

    $("[name=query]").val("changed").trigger("input");
    $("[name=enabled]").prop("checked", true).trigger("change");
    await updated();

    const state = $("#form").star<{
      filters: { query: string; enabled: boolean };
    }>("state")!;
    expect(state.filters).toEqual({ query: "changed", enabled: true });
    expect($("output").text()).toBe("changed:true");
  });

  it("applies prevent, stop, once, debounce, and throttle event options", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<section id="app"><button class="run">Run</button></section>`;
    const action = vi.fn();

    $("#app").star({
      actions: { run: action },
      ui: {
        ".run": {
          on: {
            click: {
              action: "run",
              prevent: true,
              stop: true,
              once: true,
              debounce: 50,
            },
          },
        },
      },
    });

    const first = $.Event("click");
    $(".run").trigger(first);
    $(".run").trigger("click");

    expect(first.isDefaultPrevented()).toBe(true);
    expect(first.isPropagationStopped()).toBe(true);
    expect(action).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(action).toHaveBeenCalledTimes(1);

    $("#app").star("destroy");

    const throttled = vi.fn();
    $("#app").star({
      actions: { run: throttled },
      ui: {
        ".run": { on: { click: { action: "run", throttle: 100 } } },
      },
    });

    $(".run").trigger("click").trigger("click");
    expect(throttled).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    $(".run").trigger("click");
    expect(throttled).toHaveBeenCalledTimes(2);
  });

  it("tracks binding dependencies instead of refreshing unrelated rules", async () => {
    document.body.innerHTML = `
      <section id="app"><output class="a"></output><output class="b"></output></section>
    `;
    const renderA = vi.fn(({ state }: { state: { a: number } }) => state.a);
    const renderB = vi.fn(({ state }: { state: { b: number } }) => state.b);

    $("#app").star({
      state: { a: 0, b: 0 },
      ui: {
        ".a": { text: renderA },
        ".b": { text: renderB },
      },
    });

    const state = $("#app").star<{ a: number; b: number }>("state")!;
    state.a = 1;
    await updated();

    expect(renderA).toHaveBeenCalledTimes(2);
    expect(renderB).toHaveBeenCalledTimes(1);
  });

  it("supports global actions and explicit refreshes", () => {
    document.body.innerHTML = `<section id="app"><button>Run</button><output></output></section>`;
    let label = "before";

    $.star.action("test:global", ({ $root }) => {
      $root.attr("data-global-action", "called");
    });

    $("#app").star({
      ui: {
        button: { on: { click: "test:global" } },
        output: { text: () => label },
      },
    });

    $("button").trigger("click");
    expect($("#app").attr("data-global-action")).toBe("called");
    expect($("output").text()).toBe("before");

    label = "after";
    $("#app").star("refresh");
    expect($("output").text()).toBe("after");
  });

  it("models radio groups and multi-select values", async () => {
    document.body.innerHTML = `
      <form id="form">
        <input type="radio" name="size" value="small">
        <input type="radio" name="size" value="large">
        <select name="colors" multiple>
          <option value="red">Red</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
        </select>
      </form>
    `;

    $("#form").star({
      state: { size: "large", colors: ["red", "green"] },
      ui: {
        '[name="size"]': { model: "size" },
        '[name="colors"]': { model: "colors" },
      },
    });

    expect($("[name=size][value=large]").prop("checked")).toBe(true);
    expect($("[name=colors]").val()).toEqual(["red", "green"]);

    $("[name=size][value=small]").prop("checked", true).trigger("change");
    $("[name=colors]").val(["blue"]).trigger("change");
    await updated();

    const state = $("#form").star<{ size: string; colors: string[] }>("state")!;
    expect(state.size).toBe("small");
    expect(state.colors).toEqual(["blue"]);
  });

  it("mounts dynamic jQuery plugins once and cleans them up", async () => {
    document.body.innerHTML = `<section id="app"><input class="widget"></section>`;
    const mounted = vi.fn();
    const unmounted = vi.fn();

    $("#app").star({
      ui: {
        ".widget": {
          mount: ({ $element }) => {
            mounted($element?.get(0));
            return () => unmounted("cleanup");
          },
          unmount: () => unmounted("unmount"),
        },
      },
    });

    expect(mounted).toHaveBeenCalledTimes(1);
    $("#app").append('<input class="widget dynamic">');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(mounted).toHaveBeenCalledTimes(2);

    $(".dynamic").remove();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(unmounted).toHaveBeenCalledTimes(2);

    $("#app").star("destroy");
    expect(unmounted).toHaveBeenCalledTimes(4);
  });

  it("isolates state per root and stops reacting after destruction", async () => {
    document.body.innerHTML = `
      <section class="counter"><output></output></section>
      <section class="counter"><output></output></section>
    `;

    $(".counter").star({
      state: { count: 0 },
      ui: { output: { text: ({ state }) => state.count } },
    });

    const first = $(".counter").eq(0);
    const second = $(".counter").eq(1);
    const firstState = first.star<{ count: number }>("state")!;
    firstState.count = 4;
    await updated();

    expect(first.find("output").text()).toBe("4");
    expect(second.find("output").text()).toBe("0");

    first.star("destroy");
    firstState.count = 8;
    await updated();
    expect(first.find("output").text()).toBe("4");
  });
});

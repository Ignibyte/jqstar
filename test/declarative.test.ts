import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

async function settled(): Promise<void> {
  await $.star.nextUpdate();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("declarative jQuery Star", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    $.fx.off = true;
  });

  afterEach(() => {
    $("body").children().star("destroy");
    $.star.clearExpressionCache();
    $.fx.off = false;
    vi.useRealTimers();
  });

  it("runs the requested jQuery expression while updating a reactive signal", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++; $(el).fadeOut()">
          Increment and disappear
        </button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    expect($("output").text()).toBe("0");

    $("button").trigger("click");
    await settled();

    expect($("#app").star<{ count: number }>("state")?.count).toBe(1);
    expect($("output").text()).toBe("1");
    expect($("button").css("display")).toBe("none");
  });

  it("keeps $ as real jQuery and exposes el, evt, and this", async () => {
    document.body.innerHTML = `
      <section id="app">
        <button data-on:click="$(el).attr('data-proof', $.fn.jquery); $(this).attr('data-event', evt.type); $el.attr('data-el', 'yes'); $root.attr('data-root', 'yes')">
          Prove context
        </button>
      </section>
    `;

    $("#app").star();
    $("button").trigger("click");
    await settled();

    expect($("button").attr("data-proof")).toBe($.fn.jquery);
    expect($("button").attr("data-event")).toBe("click");
    expect($("button").attr("data-el")).toBe("yes");
    expect($("#app").attr("data-root")).toBe("yes");
  });

  it("invokes @name actions and evaluates their arguments against signals", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ itemId: 42 }">
        <button data-on:click="@removeItem($itemId, 'archive')">Remove</button>
      </section>
    `;
    const remove = vi.fn(({ $element, args }) => {
      $element?.attr("data-removed", String(args?.[0]));
    });
    $.star.action("removeItem", remove);

    $("#app").star();
    $("button").trigger("click");
    await settled();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0].args).toEqual([42, "archive"]);
    expect($("button").attr("data-removed")).toBe("42");
  });

  it("reacts through text, computed, show, class, attribute, property, style, and effect directives", async () => {
    document.body.innerHTML = `
      <section
        id="app"
        data-signals="{ count: 1 }"
        data-computed:double="$count * 2"
      >
        <button data-on:click="$count++">Increment</button>
        <output
          data-text="$double"
          data-show="$count > 0"
          data-class:ready="$count >= 2"
          data-attr:aria-label="'Count ' + $count"
          data-prop:title="'Double ' + $double"
          data-style:color="$count >= 2 ? 'green' : 'red'"
        ></output>
        <i data-effect="$(el).attr('data-seen', $count)"></i>
      </section>
    `;

    $("#app").star();
    expect($("output").text()).toBe("2");
    expect($("i").attr("data-seen")).toBe("1");

    $("button").trigger("click");
    await settled();

    expect($("output").text()).toBe("4");
    expect($("output").hasClass("ready")).toBe(true);
    expect($("output").attr("aria-label")).toBe("Count 2");
    expect($("output").prop("title")).toBe("Double 4");
    expect($<HTMLElement>("output").get(0)?.style.color).toBe("green");
    expect($("i").attr("data-seen")).toBe("2");
  });

  it("provides two-way nested bindings for text and checkboxes", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ user: { name: 'Ada', subscribed: false } }">
        <input name="name" data-bind:user.name>
        <input name="subscribed" type="checkbox" data-bind:user.subscribed>
        <output data-text="$user.name + ':' + $user.subscribed"></output>
      </section>
    `;

    $("#app").star();
    expect($("[name=name]").val()).toBe("Ada");

    $("[name=name]").val("Grace").trigger("input");
    $("[name=subscribed]").prop("checked", true).trigger("change");
    await settled();

    expect($("output").text()).toBe("Grace:true");
    expect($("#app").star<{ user: { name: string; subscribed: boolean } }>("state")?.user).toEqual({
      name: "Grace",
      subscribed: true,
    });
  });

  it("supports prevent, once, key, debounce, and outside modifiers", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button class="once" data-on:click__prevent__once="$count++">Once</button>
        <input data-on:keydown__enter__debounce.25ms="$count += 10">
        <aside data-on:pointerdown__outside="$count += 100">Panel</aside>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    const click = $.Event("click");
    $(".once").trigger(click).trigger("click");
    expect(click.isDefaultPrevented()).toBe(true);

    $("input").trigger($.Event("keydown", { key: "Escape" }));
    $("input").trigger($.Event("keydown", { key: "Enter" }));
    await vi.advanceTimersByTimeAsync(25);

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await $.star.nextUpdate();
    expect($("output").text()).toBe("111");
  });

  it("initializes changed and dynamically inserted directives exactly once", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++">Increment</button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    $("button").attr("data-on:click", "$count += 2");
    await settled();
    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("2");

    $("#app").append(`
      <button class="dynamic" data-on:click="$count += 3">Dynamic</button>
      <strong data-text="$count"></strong>
    `);
    await settled();
    $(".dynamic").trigger("click");
    await settled();

    expect($("output").text()).toBe("5");
    expect($("strong").text()).toBe("5");
  });

  it("runs initialization and destruction actions during DOM lifecycle", async () => {
    document.body.innerHTML = `
      <section id="app">
        <div class="widget" data-init="@mountWidget" data-destroy="@destroyWidget"></div>
      </section>
    `;
    const mount = vi.fn();
    const destroy = vi.fn();
    $.star.action("mountWidget", mount).action("destroyWidget", destroy);

    $("#app").star();
    await settled();
    expect(mount).toHaveBeenCalledTimes(1);

    $(".widget").remove();
    await settled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("reports malformed expressions without preventing other directives", () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 2 }">
        <span class="bad" data-text="("></span>
        <span class="good" data-text="$count"></span>
      </section>
    `;
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => errors.push(detail));

    $("#app").star();

    expect(errors).toHaveLength(1);
    expect($(".good").text()).toBe("2");
  });

  it("boots from a selector, merges signal declarations, and awaits event expressions", async () => {
    document.body.innerHTML = `
      <main id="app" data-signals="{ count: 1, user: { first: 'Ada' } }">
        <div data-signals="{ count: 2, user: { last: 'Lovelace' } }">
          <button data-on:click="await Promise.resolve(); $count++">Increment later</button>
          <output data-text="$user.first + ' ' + $user.last + ': ' + $count"></output>
        </div>
      </main>
    `;

    $.star.boot("#app");
    expect($("#app").star("instance")?.mode).toBe("attributes");
    expect($("output").text()).toBe("Ada Lovelace: 2");

    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("Ada Lovelace: 3");
  });

  it("handles HTML and object class bindings while leaving ignored subtrees alone", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ ready: false }">
        <div class="markup" data-html="$ready ? '<strong>Ready</strong>' : '<em>Waiting</em>'"></div>
        <div class="classes" data-class="{ ready: $ready, waiting: !$ready }"></div>
        <div data-ignore>
          <button class="ignored" data-on:click="$ready = true">Ignored</button>
        </div>
      </section>
    `;

    $("#app").star();
    expect($(".markup em").text()).toBe("Waiting");
    expect($(".classes").hasClass("waiting")).toBe(true);

    $(".ignored").trigger("click");
    await settled();
    expect($("#app").star<{ ready: boolean }>("state")?.ready).toBe(false);

    $("[data-ignore]").append(
      '<button class="ignored-later" data-on:click="$ready = true">Later</button>',
    );
    await settled();
    $(".ignored-later").trigger("click");
    await settled();
    expect($("#app").star<{ ready: boolean }>("state")?.ready).toBe(false);

    $("#app").star<{ ready: boolean }>("state")!.ready = true;
    await settled();
    expect($(".markup strong").text()).toBe("Ready");
    expect($(".classes").hasClass("ready")).toBe(true);
  });

  it("initializes directives inserted by an initial data-html binding", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ ready: false }">
        <div class="injected" data-html="\`<button data-on:click='$ready = true'>Activate</button>\`"></div>
        <output data-text="$ready"></output>
      </section>
    `;

    $("#app").star();
    await settled();
    $(".injected button").trigger("click");
    await settled();
    expect($("output").text()).toBe("true");
  });

  it("binds kebab names, checkbox arrays, radio groups, and multiple selects", async () => {
    document.body.innerHTML = `
      <section
        id="app"
        data-signals="{ displayName: 'Ada', colors: ['red'], size: 'large', tags: ['one'] }"
      >
        <input name="display" data-bind:display-name>
        <input class="color" type="checkbox" value="red" data-bind:colors>
        <input class="color" type="checkbox" value="blue" data-bind:colors>
        <input type="radio" name="size" value="small" data-bind:size>
        <input type="radio" name="size" value="large" data-bind:size>
        <select name="tags" multiple data-bind:tags>
          <option value="one">One</option>
          <option value="two">Two</option>
        </select>
      </section>
    `;

    $("#app").star();
    expect($("[name=display]").val()).toBe("Ada");
    expect($(".color[value=red]").prop("checked")).toBe(true);
    expect($("[name=size][value=large]").prop("checked")).toBe(true);
    expect($("[name=tags]").val()).toEqual(["one"]);

    $("[name=display]").val("Grace").trigger("input");
    $(".color[value=blue]").prop("checked", true).trigger("change");
    $("[name=size][value=small]").prop("checked", true).trigger("change");
    $("[name=tags]").val(["two"]).trigger("change");
    await settled();

    const state = $("#app").star<{
      displayName: string;
      colors: string[];
      size: string;
      tags: string[];
    }>("state")!;
    expect(state).toMatchObject({
      displayName: "Grace",
      colors: ["red", "blue"],
      size: "small",
      tags: ["two"],
    });
  });

  it("supports stop, self, throttle, window, document, capture, and passive modifiers", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button class="stop" data-on:click__stop="$count++">Stop</button>
        <div class="self" data-on:click__self="$count += 10"><span>Child</span></div>
        <button class="throttle" data-on:click__throttle.50ms="$count += 100">Throttle</button>
        <i data-on:resize__window__passive="$count += 1000"></i>
        <i data-on:star-event__document__capture="$count += 10000"></i>
        <output data-text="$count"></output>
      </section>
    `;
    const bubbled = vi.fn();
    $("#app").on("click", bubbled);

    $("#app").star();
    $(".stop").trigger("click");
    expect(bubbled).not.toHaveBeenCalled();

    $(".self span").trigger("click");
    $(".self").trigger("click");
    $(".throttle").trigger("click").trigger("click");
    await vi.advanceTimersByTimeAsync(50);
    $(".throttle").trigger("click");
    window.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("star-event"));
    await $.star.nextUpdate();

    expect($("output").text()).toBe("11211");
  });

  it("stops declarative effects and listeners when explicitly destroyed", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++">Increment</button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    const state = $("#app").star<{ count: number }>("state")!;
    $("#app").star("destroy");

    state.count = 10;
    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("0");
    expect(state.count).toBe(10);
    expect($("#app").star("instance")).toBeUndefined();
  });
});
